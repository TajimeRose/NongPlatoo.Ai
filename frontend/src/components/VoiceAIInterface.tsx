import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

interface VoiceAIInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
}

const VoiceAIInterface = ({ isOpen, onClose }: VoiceAIInterfaceProps) => {
    // Hooks
    const {
        isListening,
        transcript,
        startListening,
        stopListening,
        hasSupport: hasSTTSupport
    } = useSpeechRecognition({
        language: 'th-TH',
        continuous: false, // Stop after one sentence to process
        onResult: (result) => handleUserSpeech(result)
    });

    const {
        speak,
        cancel: cancelSpeech,
        isSpeaking: isAssistantSpeaking,
        currentSentence, // Get currently speaking text
        hasSupport: hasTTSSupport
    } = useSpeechSynthesis();

    const { videoRef, result: faceResult } = useFaceDetection(isOpen);

    // State
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [pulseIntensity, setPulseIntensity] = useState(0);
    const [faceDetected, setFaceDetected] = useState(false);
    const [showGreeting, setShowGreeting] = useState(false);
    const [assistantMessage, setAssistantMessage] = useState("");

    // Refs
    const faceDetectionInitialRef = useRef(false);
    const greetingTimeoutRef = useRef<number | null>(null);
    const processingRef = useRef(false);

    // Initial greeting and auto-start listening
    useEffect(() => {
        if (!isOpen) {
            setFaceDetected(false);
            setShowGreeting(false);
            setStatus('idle');
            cancelSpeech();
            stopListening();
            if (greetingTimeoutRef.current) clearTimeout(greetingTimeoutRef.current);
            return;
        }

        // Auto-start listening immediately on mount (if ready)
        // We delay slightly to allow UI transition
        const timer = setTimeout(() => {
            if (!isListening && !isAssistantSpeaking && !processingRef.current) {
                console.log("[VoiceAI] Auto-starting listening...");
                startListening();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [isOpen, isListening, isAssistantSpeaking, startListening, cancelSpeech, stopListening]);

    // Separate effect for face detection greeting (optional feature)
    useEffect(() => {
        if (!isOpen) return;

        if (faceResult.hasFace && !faceDetected) {
            setFaceDetected(true);
            if (!faceDetectionInitialRef.current) {
                setShowGreeting(true);
                faceDetectionInitialRef.current = true;

                const greetingText = "สวัสดีค่ะ มีอะไรให้ช่วยไหมคะ";
                speak(greetingText);

                greetingTimeoutRef.current = window.setTimeout(() => {
                    setShowGreeting(false);
                }, 5000);
            }
        } else if (!faceResult.hasFace && faceDetected) {
            setFaceDetected(false);
        }
    }, [isOpen, faceResult.hasFace, faceDetected, speak]);

    // Handle user speech result
    const handleUserSpeech = async (text: string) => {
        if (!text.trim() || processingRef.current) return;

        console.log("User said:", text);
        setStatus('processing');
        processingRef.current = true;
        stopListening(); // Ensure we stop listening while processing

        try {
            await processVoiceQuery(text);
        } catch (error) {
            console.error("Error processing query:", error);
            speak("ขอโทษค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่นะคะ");
            setStatus('idle');
        } finally {
            processingRef.current = false;
        }
    };

    // Hard stop on close
    const handleClose = () => {
        cancelSpeech();
        stopListening();
        setAssistantMessage("");
        setStatus('idle');
        onClose();
    };

    // Process query with backend stream
    const processVoiceQuery = async (query: string) => {
        setAssistantMessage("");

        try {
            const response = await fetch('/api/messages/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: query,
                    user_id: 'voice-user',
                    request_id: crypto.randomUUID()
                })
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let sentenceBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n\n');
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        try {
                            const data = JSON.parse(jsonStr);

                            if (data.type === 'text' || data.type === 'chunk') {
                                const textChunk = data.text || data.chunk || "";
                                setAssistantMessage(prev => prev + textChunk);

                                // Accumulate for TTS
                                sentenceBuffer += textChunk;

                                // OPTIMIZED Buffering Logic:
                                // goal: Start fast (low latency) -> Stay smooth (smart buffering)

                                let splitIndex = -1;

                                // Rule 1: First phrase needs to be fast! 
                                // INCREASED THRESHOLD: Was >10, now >20 to prevent tiny first chunks
                                if (!isAssistantSpeaking && sentenceBuffer.length > 20) {
                                    // Look for any weak pause (comma, space) to start ASAP
                                    const fastStartMatch = sentenceBuffer.match(/[, ]/);
                                    if (fastStartMatch && fastStartMatch.index !== undefined && fastStartMatch.index > 10) {
                                        splitIndex = fastStartMatch.index + 1;
                                    }
                                }

                                // Rule 2: Normal flow (Strong punctuation)
                                if (splitIndex === -1) {
                                    // Only split if we have a decent chunk size to avoid choppy audio
                                    if (sentenceBuffer.length > 50) {
                                        const match = sentenceBuffer.match(/[.!?\n]+(?=\s|$)/);
                                        if (match && match.index !== undefined) {
                                            splitIndex = match.index + match[0].length;
                                        }
                                    }
                                }

                                // Rule 3: Long buffer safety (prevent silence on long phrases)
                                // INCREASED THRESHOLD: Was >60, now >120 to allow longer flowing sentences
                                if (splitIndex === -1 && sentenceBuffer.length > 120) {
                                    const lastSpace = sentenceBuffer.lastIndexOf(' ');
                                    if (lastSpace > 50) {
                                        splitIndex = lastSpace + 1;
                                    }
                                }

                                // Execute split
                                if (splitIndex !== -1) {
                                    const toSpeak = sentenceBuffer.slice(0, splitIndex);
                                    const remaining = sentenceBuffer.slice(splitIndex);

                                    if (toSpeak.trim()) {
                                        if (!isAssistantSpeaking) setStatus('speaking');
                                        speak(toSpeak);
                                    }
                                    sentenceBuffer = remaining;
                                }

                                // Emergency flush for huge chunks
                                else if (sentenceBuffer.length > 250) {
                                    if (!isAssistantSpeaking) setStatus('speaking');
                                    speak(sentenceBuffer);
                                    sentenceBuffer = "";
                                }
                            } else if (data.type === 'error') {
                                console.error("Stream error:", data.message);
                            }
                        } catch (e) {
                            console.warn("Error parsing stream line:", e);
                        }
                    }
                }
            }

            // Flush remaining buffer at the end
            if (sentenceBuffer.trim()) {
                speak(sentenceBuffer);
            }

        } catch (err) {
            console.error("Fetch error:", err);
            speak("ขอโทษค่ะ เชื่อมต่อไม่ได้ในขณะนี้");
        } finally {
            // After processing, maybe wait for speech to end then go to idle?
            // The useSpeechSynthesis hook 'isSpeaking' will handle the visual state
            // We can rely on user manually clicking mic again, or auto-restart?
            // For now, manual restart (Speed Demon user can tap quickly)
            if (!isAssistantSpeaking) setStatus('idle');
        }
    };

    // Sync status with hooks
    useEffect(() => {
        if (isListening) setStatus('listening');
        else if (isAssistantSpeaking) setStatus('speaking');
        else if (!processingRef.current) setStatus('idle');
    }, [isListening, isAssistantSpeaking]);

    // Audio visualization effect
    useEffect(() => {
        if (!isOpen || status === 'idle') {
            setPulseIntensity(5);
            return;
        }

        const interval = setInterval(() => {
            // Randomize intensity based on state
            const base = status === 'listening' ? 50 : (status === 'speaking' ? 70 : 20);
            const varAmount = status === 'processing' ? 10 : 40;
            setPulseIntensity(base + Math.random() * varAmount);
        }, 100);

        return () => clearInterval(interval);
    }, [isOpen, status]);

    if (!isOpen) return null;

    const orbSize = 200 + (pulseIntensity * 0.5);
    const glowIntensity = 20 + (pulseIntensity * 0.3);

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col overflow-hidden">
            {/* Face Detection Video (Hidden) */}
            <video ref={videoRef} className="hidden" autoPlay playsInline muted />

            {/* Close Button */}
            <div className="absolute top-6 right-6 z-10">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12">
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Header */}
            <div className="pt-16 text-center animate-in slide-in-from-top duration-500">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-400 text-sm font-medium tracking-widest uppercase">NongPlatoo Voice AI</span>
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-white/60 text-sm">ระบบผู้ช่วยเสียงอัจฉริยะ</p>
                {!hasSTTSupport && <p className="text-red-400 text-xs mt-2">Browser doesn't support Speech Recognition</p>}
            </div>

            {/* Main Orb Container */}
            <div className="flex-1 flex flex-col items-center justify-center relative">

                {/* Live Transcript Display */}
                {(transcript || assistantMessage || currentSentence) && (
                    <div className="absolute top-1/4 w-full max-w-2xl px-8 text-center z-20 pointer-events-none">
                        <p className={`text-2xl font-light transition-all duration-300 ${status === 'listening' ? 'text-white opacity-100 scale-105' : 'text-white/50 scale-100'}`}>
                            {status === 'listening' ? transcript :
                                status === 'speaking' ? (currentSentence || "...") :
                                    (assistantMessage || transcript)}
                        </p>
                    </div>
                )}

                {/* Background Particles (Decor) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Orb Visuals */}
                <div className="relative">
                    {/* Outer Glows */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
                        style={{ width: orbSize + 100, height: orbSize + 100, background: `radial-gradient(circle, ${status === 'listening' ? 'rgba(255, 100, 100, 0.3)' : 'rgba(34, 211, 238, 0.3)'} 0%, transparent 70%)` }}
                    />

                    {/* Rotating Rings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30 w-[300px] h-[300px] animate-[spin_8s_linear_infinite]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/20 w-[260px] h-[260px] animate-[spin_6s_linear_infinite_reverse]" />

                    {/* Core Orb */}
                    <div className="relative rounded-full flex items-center justify-center transition-all duration-300 transform"
                        style={{
                            width: orbSize, height: orbSize,
                            background: status === 'listening'
                                ? `radial-gradient(circle, rgba(220, 38, 38, 0.8) 0%, rgba(69, 10, 10, 0.95) 100%)` // Red when listening
                                : `radial-gradient(circle, rgba(30, 58, 138, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)`, // Blue otherwise
                            boxShadow: `0 0 ${glowIntensity}px ${status === 'listening' ? 'rgba(220, 38, 38, 0.5)' : 'rgba(34, 211, 238, 0.5)'}`
                        }}
                    >
                        {/* Inner Pulse */}
                        <div className="absolute rounded-full w-[70%] h-[70%] bg-white/10 animate-pulse" />

                        {/* Icon */}
                        {status === 'listening' ? (
                            <Mic className="w-16 h-16 text-white animate-pulse" />
                        ) : status === 'speaking' ? (
                            <Volume2 className="w-16 h-16 text-cyan-400 animate-bounce" />
                        ) : (
                            <MicOff className="w-16 h-16 text-white/50" />
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="pb-16 text-center animate-in slide-in-from-bottom duration-500">
                <div className="mb-8 h-8">
                    {status === 'listening' && <span className="text-cyan-400 animate-pulse">Listening...</span>}
                    {status === 'processing' && <span className="text-yellow-400 animate-pulse">Thinking...</span>}
                    {status === 'speaking' && <span className="text-green-400 animate-pulse">Speaking...</span>}
                </div>

                <div className="flex justify-center gap-4">
                    {/* Simplified Control Button */}
                    <div className="flex gap-4">
                        {!isListening && status !== 'processing' && status !== 'speaking' && (
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={startListening}
                                className="rounded-full px-8 py-6 text-lg border-cyan-500 text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 hover:scale-105 transition-all duration-300"
                            >
                                <Mic className="w-5 h-5 mr-2" />
                                พูดอีกครั้ง
                            </Button>
                        )}

                        <Button
                            variant="default" // Changed from outline to default/solid
                            size="lg"
                            onClick={handleClose}
                            className="rounded-full px-8 py-6 text-lg bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg transition-all duration-300"
                        >
                            <X className="w-5 h-5 mr-2" />
                            ปิด
                        </Button>
                    </div>
                </div>
                <p className="text-white/30 text-xs mt-4">Powered by OpenAI & NongPlatoo AI</p>
            </div>
        </div>
    );
};

export default VoiceAIInterface;
