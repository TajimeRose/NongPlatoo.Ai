import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Sparkles, AlertCircle, Mic, Square, Volume2, VolumeX, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import ChatMessage from "@/components/ChatMessage";
import VoiceAIInterface from "@/components/VoiceAIInterface";
import BrowserCompatibilityWarning from "@/components/BrowserCompatibilityWarning";
import { detectBrowserCapabilities, BrowserCapabilities } from "@/utils/browserCapabilities";
import { getPlaceById } from "@/data/places";

// Web Speech API type declarations for TypeScript
// Using 'any' for the static constructor type to match DOM lib expectations loosely
interface SpeechRecognitionStatic {
  new(): any;
}
// We define a partial interface for what we actually use
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: any) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: any) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

type SpeechRecognition = SpeechRecognitionInstance;
type SpeechRecognitionEvent = Event & { results: SpeechRecognitionResultList; resultIndex: number };
type SpeechRecognitionErrorEvent = Event & { error: string };

type StructuredPlace = {
  id?: string | number;
  place_name?: string;
  name?: string;
  description?: string;
  short_description?: string;
  address?: string;
  location?: string | { district?: string; province?: string };
  category?: string;
  type?: string | string[];
  images?: string[];
  opening_hours?: string;
  contact?: string;
};

type AssistantPayload = {
  text: string;
  structured_data?: StructuredPlace[];
  createdAt?: string;
  source?: string;
  language?: string;
  intent?: string;
};

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  structuredData?: StructuredPlace[];
  meta?: {
    source?: string;
    intent?: string;
    intent_type?: string;
  };
  userMessage?: string;
  isStreaming?: boolean;
  chatLogId?: number;  // Backend Chat Log ID for feedback
}

import { getApiBase } from "@/lib/api";

const API_BASE = getApiBase();

const suggestedQuestions = [
  "ดอนหอยหลอดไปยังไง",
  "แนะนำร้านอาหารอร่อยๆ",
  "คาเฟ่บรรยากาศดีๆ ในสมุทรสงคราม",
];

const Chat = () => {
  const [searchParams] = useSearchParams();
  const placeId = searchParams.get("place");
  const place = placeId ? getPlaceById(placeId) : null;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: place
        ? `สวัสดีค่ะ! I see you're interested in ${place.nameTh} (${place.name}). I'd be happy to help you learn more about this place or plan your visit. What would you like to know?`
        : "สวัสดีค่ะ! ฉันคือน้องปลาทู ผู้ช่วยท่องเที่ยวสมุทรสงคราม พร้อมช่วยคุณหาสถานที่ท่องเที่ยว ร้านอาหาร และที่พัก 🐟✨",
      isUser: false,
      timestamp: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isVoiceAIOpen, setIsVoiceAIOpen] = useState(false);
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionRef = useRef<any>(null); // Use any for ref to avoid strict type issues
  const voiceTextRef = useRef("");
  const pendingRequestRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect browser capabilities
    const caps = detectBrowserCapabilities();
    setCapabilities(caps);
    
    // Check speech support
    const windowWithSpeech = window as unknown as Window & {
      SpeechRecognition?: SpeechRecognitionStatic;
      webkitSpeechRecognition?: SpeechRecognitionStatic;
    };
    // Cast window to any to bypass strict type checking for non-standard APIs
    const windowWithSpeech = window as any;
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    setHasSpeechSupport(Boolean(SpeechRecognition) && caps.canUseSpeechRecognition);

    // Check if iOS audio needs unlock (first time)
    if (caps.recommendTTSGesture) {
      setNeedsAudioUnlock(true);
    }

    return () => {
      recognitionRef.current?.abort();
      eventSourceRef.current?.close();
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const createTimestamp = () =>
    new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const mapAssistant = (assistant: AssistantPayload, userMsg?: string): Message => {
    return {
      id: `${Date.now()}-assistant`,
      content: assistant.text,
      structuredData: assistant.structured_data,
      isUser: false,
      timestamp:
        assistant.createdAt ||
        new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      meta: {
        source: assistant.source,
        intent: assistant.intent,
      },
      userMessage: userMsg,
    };
  };

  const playTextToSpeech = async (text: string) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }

      setIsPlayingAudio(true);

      // Try server-side TTS first (Google Cloud TTS with Thai voice)
      try {
        const response = await fetch(`${API_BASE}/api/text-to-speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            language: "th" // Specify Thai language for better pronunciation
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate speech");
        }

        const data = await response.json();

        if (data.success && data.audio) {
          // Convert base64 to audio blob
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
            { type: 'audio/mp3' }
          );
          const audioUrl = URL.createObjectURL(audioBlob);

          const audio = new Audio(audioUrl);
          audio.onended = () => {
            setIsPlayingAudio(false);
            setCurrentAudio(null);
            URL.revokeObjectURL(audioUrl);
          };
          audio.onerror = () => {
            setIsPlayingAudio(false);
            setCurrentAudio(null);
            // Fallback to browser TTS
            playBrowserTTS(text);
          };

          setCurrentAudio(audio);
          await audio.play();
          return;
        }
      } catch (serverError) {
        console.warn("Server TTS failed, using browser TTS:", serverError);
        // Fallback to browser-based TTS
        playBrowserTTS(text);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setIsPlayingAudio(false);
      setError("ไม่สามารถเล่นเสียงได้ในขณะนี้");
    }
  };

  const playBrowserTTS = (text: string) => {
    // Use browser's Web Speech API as fallback
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH'; // Thai language
      utterance.rate = 1.3; // Faster speech
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a Thai voice
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(voice => voice.lang.startsWith('th'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      utterance.onend = () => {
        setIsPlayingAudio(false);
      };

      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setError("ไม่สามารถเล่นเสียงได้");
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
      setError("เบราว์เซอร์ไม่รองรับการอ่านข้อความ");
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlayingAudio(false);
    }
    // Also stop browser TTS if active
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Non-streaming version for fallback
  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      isUser: true,
      timestamp: createTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);

    const controller = new AbortController();
    pendingRequestRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          user_id: "web",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Unable to reach AI service");
      }

      const data = await response.json();

      if (data?.assistant) {
        setMessages((prev) => [...prev, mapAssistant(data.assistant, messageText)]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-fallback`,
            content:
              "ขออภัยค่ะ ระบบตอบกลับช้าชั่วคราว กรุณาลองใหม่อีกครั้งหรือถามคำถามอื่นดูนะคะ",
            isUser: false,
            timestamp: createTimestamp(),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "AbortError") {
        setError("ยกเลิกการส่งข้อความ");
      } else {
        setError("ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่");
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          content:
            (err as Error).name === "AbortError"
              ? "ยกเลิกการส่งข้อความแล้ว"
              : "ขออภัยค่ะ ตอนนี้เชื่อมต่อ AI ไม่ได้ กรุณาลองใหม่อีกครั้งในภายหลัง",
          isUser: false,
          timestamp: createTimestamp(),
        },
      ]);
    } finally {
      setIsTyping(false);
      pendingRequestRef.current = null;
    }
  };

  // Streaming version - Optimized for perceived speed
  const handleSendWithStreaming = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      isUser: true,
      timestamp: createTimestamp(),
    };

    // SPEED OPTIMIZATION 1: Instant feedback - clear input immediately
    setInput("");

    // SPEED OPTIMIZATION 2: Add user message and typing indicator together
    const assistantId = `${Date.now()}-assistant`;
    const assistantMessage: Message = {
      id: assistantId,
      content: "",
      isUser: false,
      timestamp: createTimestamp(),
      isStreaming: true,
    };

    // Batch state updates for better performance
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsTyping(true);
    setError(null);

    const controller = new AbortController();
    pendingRequestRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/api/messages/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          user_id: "web",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Fallback to non-streaming if streaming endpoint fails
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
        await handleSend(messageText);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let structuredData: StructuredPlace[] = [];
      let intentType = "";
      let lastUpdateTime = Date.now();
      const UPDATE_THROTTLE = 50; // Update UI every 50ms max for smooth streaming

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "intent") {
                  intentType = data.intent_type;
                } else if (data.type === "structured_data") {
                  structuredData = data.data;
                } else if (data.type === "text") {
                  fullText += data.text;

                  // SPEED OPTIMIZATION 3: Throttle UI updates for smooth streaming
                  const now = Date.now();
                  if (now - lastUpdateTime > UPDATE_THROTTLE || data.text.includes(" ")) {
                    lastUpdateTime = now;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantId
                          ? { ...msg, content: fullText }
                          : msg
                      )
                    );
                  }
                } else if (data.type === "done") {
                  // Finalize message with chat_log_id for feedback
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? {
                          ...msg,
                          content: fullText,
                          structuredData,
                          meta: {
                            intent_type: intentType,
                            source: "streaming",
                          },
                          isStreaming: false,
                          chatLogId: data.chat_log_id,  // Store for feedback
                        }
                        : msg
                    )
                  );
                  // Auto-play TTS for final response (optional - can be disabled)
                  // if (fullText) {
                  //   playTextToSpeech(fullText);
                  // }
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                console.warn("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "AbortError") {
        setError("ยกเลิกการส่งข้อความ");
      } else {
        setError("ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่");
      }
      // Remove streaming placeholder on error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          content: "ขออภัยค่ะ ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง",
          isUser: false,
          timestamp: createTimestamp(),
        },
      ]);
    } finally {
      setIsTyping(false);
      pendingRequestRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendWithStreaming(); // Use streaming for real-time response
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const cancelSend = () => {
    pendingRequestRef.current?.abort();
    pendingRequestRef.current = null;
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsTyping(false);
  };

  const startListening = async () => {
    if (typeof window === "undefined") return;
    
    if (!capabilities || !capabilities.canUseSpeechRecognition) {
      if (capabilities?.isIPad) {
        setError("📱 Speech recognition is not available on iPad. Please use text input instead.");
      } else if (capabilities?.isSafari) {
        setError("⚠️ Speech recognition is not supported in Safari. Try Chrome or Edge.");
      } else {
        setError("This browser doesn't support speech recognition. Try Chrome or Edge.");
      }
      return;
    }

    const windowWithSpeech = window as unknown as Window & {
      SpeechRecognition?: SpeechRecognitionStatic;
      webkitSpeechRecognition?: SpeechRecognitionStatic;
    };
    // Cast window to any to bypass strict type checking for non-standard APIs
    const windowWithSpeech = window as any;
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not available. Please use text input.");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition() as any;
    recognition.lang = "th-TH";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition as unknown as SpeechRecognitionInstance;

    let finalTranscript = "";
    voiceTextRef.current = "";
    setVoiceText("");
    setIsListening(true);
    setError(null);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      const combined = `${finalTranscript} ${interimTranscript}`.trim();
      voiceTextRef.current = combined;
      setVoiceText(combined);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Voice recognition error", event.error);
      setIsListening(false);
      if (event.error === "network") {
        setError("Network error. Please check your connection and try again.");
      } else if (event.error === "no-speech") {
        setError("No sound detected. Please speak clearly and try again.");
      } else if (event.error === "not-allowed") {
        setError("❌ Microphone permission denied. Check Settings > Safari > Microphone.");
      } else {
        setError("Microphone error. Please try again or use text input.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const textToSend = (voiceTextRef.current || finalTranscript).trim();
      if (textToSend) {
        handleSend(textToSend);
      } else {
        setError("No speech detected. Please try again.");
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Voice Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-end md:items-center justify-center px-4 pb-10">
          <div className="w-full max-w-lg bg-gradient-to-br from-primary via-primary/80 to-primary-foreground text-primary-foreground rounded-3xl p-6 shadow-2xl border border-primary/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary-foreground/20 animate-ping" />
                  <div className="relative w-12 h-12 rounded-2xl bg-primary-foreground/30 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                    NongPlaToo Voice
                  </p>
                  <p className="text-lg font-semibold">กำลังฟังอยู่...</p>
                  <p className="text-sm text-primary-foreground/80">
                    พูดคำถามของคุณ
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={stopListening}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Square className="w-4 h-4" />
                หยุด
              </Button>
            </div>

            <div className="mt-5 bg-white/10 border border-white/20 rounded-2xl p-4 min-h-[92px]">
              <p className="text-sm text-primary-foreground/80">
                {voiceText || "กำลังรอคำพูด..."}
              </p>
              <div className="mt-4 flex items-center gap-1">
                <span className="w-1.5 h-6 bg-white/40 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                <span className="w-1.5 h-9 bg-white/60 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
                <span className="w-1.5 h-4 bg-white/30 rounded-full animate-[pulse_0.9s_ease-in-out_infinite]" />
                <span className="w-1.5 h-7 bg-white/50 rounded-full animate-[pulse_1.1s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto pt-16">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {error && (
            <div className="mb-4 inline-flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.content}
                isUser={message.isUser}
                timestamp={message.timestamp}
                structuredData={message.structuredData}
                meta={message.meta}
                messageId={message.id}
                chatLogId={message.chatLogId}
                userMessage={message.userMessage}
              />
            ))}

            {isTyping && (
              <div className="flex gap-3 animate-slide-up">
                <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-secondary-foreground animate-pulse" />
                </div>
                <div className="bg-card shadow-soft border border-border rounded-2xl rounded-bl-sm px-4 py-3 min-w-[200px]">
                  {/* SPEED OPTIMIZATION 4: Skeleton loading for better perceived performance */}
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4 skeleton-pulse"></div>
                    <div className="h-3 bg-muted rounded w-full skeleton-pulse animation-delay-100"></div>
                    <div className="h-3 bg-muted rounded w-5/6 skeleton-pulse animation-delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="border-t border-border bg-muted/50">
          <div className="container mx-auto px-4 py-3 max-w-3xl">
            <p className="text-xs text-muted-foreground mb-2">
              คำถามแนะนำ:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => handleSendWithStreaming(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card sticky bottom-0">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex gap-3 items-center">
            {/* Microphone Button - only show if supported */}
            {capabilities && (
              <>
                {capabilities.canUseSpeechRecognition ? (
                  <Button
                    type="button"
                    variant={isListening ? "destructive" : "secondary"}
                    size="icon"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isTyping}
                    className={isListening ? "animate-pulse shadow-elevated" : ""}
                    title="Speak your question"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={true}
                    className="opacity-50 cursor-not-allowed"
                    title={
                      capabilities.isIPad
                        ? "Speech not supported on iPad"
                        : capabilities.isSafari
                          ? "Speech not supported in Safari"
                          : "Speech not supported in this browser"
                    }
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                )}

                {/* Voice AI Button - only show if speech & camera supported */}
                {capabilities.canUseVoiceAI ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsVoiceAIOpen(true)}
                    disabled={isTyping}
                    className="border-cyan-500/50 text-cyan-600 hover:bg-cyan-500/10 hover:text-cyan-500"
                    title="Voice AI Assistant"
                  >
                    <Radio className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={true}
                    className="opacity-50 cursor-not-allowed border-gray-300"
                    title={
                      capabilities.isIPad
                        ? "Voice AI not supported on iPad"
                        : "Voice AI requires microphone access"
                    }
                  >
                    <Radio className="w-5 h-5" />
                  </Button>
                )}
              </>
            )}

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="พิมพ์ข้อความ... (Type a message)"
              className="flex-1 h-12 bg-background rounded-xl"
              disabled={isTyping}
            />
            {isPlayingAudio && (
              <Button
                type="button"
                onClick={stopAudio}
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-xl"
              >
                <VolumeX className="w-5 h-5" />
              </Button>
            )}
            {isTyping ? (
              <Button
                type="button"
                onClick={cancelSend}
                variant="destructive"
                className="h-12 px-4 rounded-xl"
              >
                <Square className="w-5 h-5" />
                หยุด
              </Button>
            ) : (
              <Button
                onClick={() => handleSendWithStreaming()}
                disabled={!input.trim()}
                className="h-12 w-12 rounded-xl"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>
          {capabilities && (
            <>
              {needsAudioUnlock && !capabilities.isAndroid && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded inline-flex items-center gap-1 border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  📢 Tap to enable audio playback on first message
                </p>
              )}

              {capabilities.isIPad && !capabilities.canUseSpeechRecognition && (
                <p className="mt-2 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded inline-flex items-center gap-1 border border-blue-200">
                  <AlertCircle className="w-3 h-3" />
                  📱 iPad: Text chat & AI work great! Speech input not available on this device.
                </p>
              )}

              {!hasSpeechSupport && !capabilities.isIPad && (
                <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Speech not available in this browser. Try Chrome, Edge, or Safari.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Voice AI Full-screen Interface */}
      <VoiceAIInterface
        isOpen={isVoiceAIOpen}
        onClose={() => setIsVoiceAIOpen(false)}
      />

      {/* Browser Compatibility Warning */}
      <BrowserCompatibilityWarning minimized={true} />
    </div>
  );
};

export default Chat;
