import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Sparkles, AlertCircle } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          user_id: "web",
        }),
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
      setError("ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่");
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          content:
            "ขออภัยค่ะ ตอนนี้เชื่อมต่อ AI ไม่ได้ กรุณาลองใหม่อีกครั้งในภายหลัง",
          isUser: false,
          timestamp: createTimestamp(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />



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
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="พิมพ์ข้อความ... (Type a message)"
              className="flex-1 h-12 bg-background rounded-xl"
              disabled={isTyping}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="h-12 w-12 rounded-xl"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
