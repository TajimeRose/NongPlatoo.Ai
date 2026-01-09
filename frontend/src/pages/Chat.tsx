import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
<<<<<<< HEAD
import { Send, Sparkles, AlertCircle, Mic, Square } from "lucide-react";
=======
import { Send, Sparkles, AlertCircle, Mic, Square, Volume2, VolumeX } from "lucide-react";
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import ChatMessage from "@/components/ChatMessage";
import { getPlaceById } from "@/data/places";

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

<<<<<<< HEAD
type AssistantPayload = {
  text: string;
  structured_data?: StructuredPlace[];
  createdAt?: string;
  source?: string;
  language?: string;
  intent?: string;
};

=======
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  structuredData?: StructuredPlace[];
  meta?: {
    source?: string;
    intent?: string;
<<<<<<< HEAD
  };
  userMessage?: string;
=======
    intent_type?: string;
  };
  userMessage?: string;
  isStreaming?: boolean;
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
}

import { getApiBase } from "@/lib/api";

const API_BASE = getApiBase();

const suggestedQuestions = [
<<<<<<< HEAD
  "Plan a one-day trip",
  "Recommend riverside cafés",
  "Romantic places for couples",
  "Best time to visit Amphawa",
=======
  "วัดบางกุ้งอยู่ที่ไหน",
  "แนะนำร้านอาหารอร่อยๆ",
  "ที่เที่ยวสำหรับคู่รัก",
  "จัดทริปหนึ่งวัน",
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
<<<<<<< HEAD
        : "สวัสดีค่ะ! ฉันคือน้องปลาทู ผู้ช่วยประชาสัมพันธ์ การท่องเที่ยวจังหวัดสมุทรสงคราม ฉันช่วยคุณหาสถานที่ท่องเที่ยว, คาเฟ่, ร่านอาหาร, โรงแรม ให้คุณเอง",
=======
        : "สวัสดีค่ะ! ฉันคือน้องปลาทู ผู้ช่วยท่องเที่ยวสมุทรสงคราม พร้อมช่วยคุณหาสถานที่ท่องเที่ยว ร้านอาหาร และที่พัก 🐟✨",
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
<<<<<<< HEAD
=======
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTextRef = useRef("");
  const pendingRequestRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
<<<<<<< HEAD
=======
  const eventSourceRef = useRef<EventSource | null>(null);
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setHasSpeechSupport(Boolean(SpeechRecognition));

    return () => {
      recognitionRef.current?.abort();
<<<<<<< HEAD
=======
      eventSourceRef.current?.close();
      currentAudio?.pause();
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
    };
  }, []);

  const createTimestamp = () =>
    new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

<<<<<<< HEAD
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

  const handleSend = async (text?: string) => {
=======
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

  const handleSendWithStreaming = async (text?: string) => {
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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

<<<<<<< HEAD
=======
    // Create a placeholder for the assistant message
    const assistantId = `${Date.now()}-assistant`;
    const assistantMessage: Message = {
      id: assistantId,
      content: "",
      isUser: false,
      timestamp: createTimestamp(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
    const controller = new AbortController();
    pendingRequestRef.current = controller;

    try {
<<<<<<< HEAD
      const response = await fetch(`${API_BASE}/api/messages`, {
=======
      const response = await fetch(`${API_BASE}/api/messages/stream`, {
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          user_id: "web",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
<<<<<<< HEAD
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
=======
        throw new Error("Failed to connect to streaming API");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let structuredData: StructuredPlace[] = [];
      let intentType = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (data.type === "intent") {
                intentType = data.intent_type;
              } else if (data.type === "structured_data") {
                structuredData = data.data;
              } else if (data.type === "text") {
                fullText += data.text;
                // Update message in real-time
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: fullText }
                      : msg
                  )
                );
              } else if (data.type === "done") {
                // Finalize message
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
                      }
                      : msg
                  )
                );
                // Auto-play TTS for final response
                if (fullText) {
                  playTextToSpeech(fullText);
                }
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            }
          }
        }
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
      }
    } catch (err) {
      console.error(err);
      if ((err as Error).name === "AbortError") {
        setError("ยกเลิกการส่งข้อความ");
      } else {
        setError("ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่");
      }
<<<<<<< HEAD
=======
      // Remove streaming placeholder on error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
<<<<<<< HEAD
          content:
            (err as Error).name === "AbortError"
              ? "ยกเลิกการส่งข้อความแล้ว"
              : "ขออภัยค่ะ ตอนนี้เชื่อมต่อ AI ไม่ได้ กรุณาลองใหม่อีกครั้งในภายหลัง",
=======
          content: "ขออภัยค่ะ ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง",
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
<<<<<<< HEAD
      handleSend();
=======
      handleSendWithStreaming();
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const cancelSend = () => {
    pendingRequestRef.current?.abort();
    pendingRequestRef.current = null;
<<<<<<< HEAD
    setIsTyping(false);
  };

  const startListening = () => {
=======
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsTyping(false);
  };

  const startListening = async () => {
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("เบราว์เซอร์นี้ไม่รองรับการรับเสียง กรุณาใช้ Chrome หรือ Edge");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognition.lang = "th-TH";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

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
      setError("ไมโครโฟนมีปัญหา หรือไม่ได้เปิดสิทธิ์ กรุณาลองใหม่");
    };

    recognition.onend = () => {
      setIsListening(false);
      const textToSend = (voiceTextRef.current || finalTranscript).trim();
      if (textToSend) {
<<<<<<< HEAD
        handleSend(textToSend);
=======
        handleSendWithStreaming(textToSend);
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
      } else {
        setError("ไม่ได้ยินเสียง หรือไม่มีข้อความส่ง กรุณาลองใหม่");
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

<<<<<<< HEAD
=======
      {/* Voice Listening Overlay */}
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
<<<<<<< HEAD
                    NongPlatoo Voice
                  </p>
                  <p className="text-lg font-semibold">กำลังฟังอยู่...</p>
                  <p className="text-sm text-primary-foreground/80">
                    พูดคำถามของคุณแล้วปล่อยมือ น้องปลาทูจะส่งให้อัตโนมัติ
=======
                    NongPlaToo Voice
                  </p>
                  <p className="text-lg font-semibold">กำลังฟังอยู่...</p>
                  <p className="text-sm text-primary-foreground/80">
                    พูดคำถามของคุณ
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
<<<<<<< HEAD
                หยุดฟัง
=======
                หยุด
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
              </Button>
            </div>

            <div className="mt-5 bg-white/10 border border-white/20 rounded-2xl p-4 min-h-[92px]">
              <p className="text-sm text-primary-foreground/80">
<<<<<<< HEAD
                {voiceText || "“สวัสดี น้องปลาทูช่วยอะไรดีคะ?”"}
=======
                {voiceText || "กำลังรอคำพูด..."}
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
              </p>
              <div className="mt-4 flex items-center gap-1">
                <span className="w-1.5 h-6 bg-white/40 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                <span className="w-1.5 h-9 bg-white/60 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
                <span className="w-1.5 h-4 bg-white/30 rounded-full animate-[pulse_0.9s_ease-in-out_infinite]" />
                <span className="w-1.5 h-7 bg-white/50 rounded-full animate-[pulse_1.1s_ease-in-out_infinite]" />
<<<<<<< HEAD
                <span className="w-1.5 h-5 bg-white/30 rounded-full animate-[pulse_1.05s_ease-in-out_infinite]" />
=======
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
              </div>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD


=======
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
                userMessage={message.userMessage}
              />
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center">
<<<<<<< HEAD
                  <Sparkles className="w-5 h-5 text-secondary-foreground" />
=======
                  <Sparkles className="w-5 h-5 text-secondary-foreground animate-pulse" />
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
                </div>
                <div className="bg-card shadow-soft border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse animation-delay-100" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse animation-delay-200" />
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
<<<<<<< HEAD
              Suggested questions:
=======
              คำถามแนะนำ:
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
<<<<<<< HEAD
                  onClick={() => handleSend(question)}
=======
                  onClick={() => handleSendWithStreaming(question)}
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
            <Button
              type="button"
              variant={isListening ? "destructive" : "secondary"}
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={!hasSpeechSupport || isTyping}
              className={isListening ? "animate-pulse shadow-elevated" : ""}
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="พิมพ์ข้อความ... (Type a message)"
              className="flex-1 h-12 bg-background rounded-xl"
              disabled={isTyping}
            />
<<<<<<< HEAD
=======
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
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
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
<<<<<<< HEAD
                onClick={() => handleSend()}
=======
                onClick={() => handleSendWithStreaming()}
>>>>>>> 4c7244b721690ab5df8e54c12381777bf4dd3138
                disabled={!input.trim()}
                className="h-12 w-12 rounded-xl"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>
          {!hasSpeechSupport && (
            <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              เบราว์เซอร์นี้ไม่รองรับการสั่งงานด้วยเสียง ลองใช้ Chrome หรือ Edge
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
