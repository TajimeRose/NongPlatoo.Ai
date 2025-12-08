import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Sparkles, AlertCircle, Mic, Square } from "lucide-react";
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
  };
  userMessage?: string;
}

import { getApiBase } from "@/lib/api";

const API_BASE = getApiBase();

const suggestedQuestions = [
  "Plan a one-day trip",
  "Recommend riverside cafés",
  "Romantic places for couples",
  "Best time to visit Amphawa",
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
        : "สวัสดีค่ะ! ฉันคือน้องปลาทู ผู้ช่วยประชาสัมพันธ์ การท่องเที่ยวจังหวัดสมุทรสงคราม ฉันช่วยคุณหาสถานที่ท่องเที่ยว, คาเฟ่, ร่านอาหาร, โรงแรม ให้คุณเอง",
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTextRef = useRef("");
  const pendingRequestRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    };
  }, []);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const cancelSend = () => {
    pendingRequestRef.current?.abort();
    pendingRequestRef.current = null;
    setIsTyping(false);
  };

  const startListening = () => {
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
        handleSend(textToSend);
      } else {
        setError("ไม่ได้ยินเสียง หรือไม่มีข้อความส่ง กรุณาลองใหม่");
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

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
                    NongPlatoo Voice
                  </p>
                  <p className="text-lg font-semibold">กำลังฟังอยู่...</p>
                  <p className="text-sm text-primary-foreground/80">
                    พูดคำถามของคุณแล้วปล่อยมือ น้องปลาทูจะส่งให้อัตโนมัติ
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
                หยุดฟัง
              </Button>
            </div>

            <div className="mt-5 bg-white/10 border border-white/20 rounded-2xl p-4 min-h-[92px]">
              <p className="text-sm text-primary-foreground/80">
                {voiceText || "“สวัสดี น้องปลาทูช่วยอะไรดีคะ?”"}
              </p>
              <div className="mt-4 flex items-center gap-1">
                <span className="w-1.5 h-6 bg-white/40 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                <span className="w-1.5 h-9 bg-white/60 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
                <span className="w-1.5 h-4 bg-white/30 rounded-full animate-[pulse_0.9s_ease-in-out_infinite]" />
                <span className="w-1.5 h-7 bg-white/50 rounded-full animate-[pulse_1.1s_ease-in-out_infinite]" />
                <span className="w-1.5 h-5 bg-white/30 rounded-full animate-[pulse_1.05s_ease-in-out_infinite]" />
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
                userMessage={message.userMessage}
              />
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-secondary-foreground" />
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
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => handleSend(question)}
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
                onClick={() => handleSend()}
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
