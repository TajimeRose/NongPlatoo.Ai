import { useState, useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFaceDetection } from "@/hooks/useFaceDetection";

interface VoiceAIInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
    onSpeak?: (text: string) => void;
}

const VoiceAIInterface = ({ isOpen, onClose, onSpeak }: VoiceAIInterfaceProps) => {
    const [isListening, setIsListening] = useState(false);
    const [pulseIntensity, setPulseIntensity] = useState(0);
    const [faceDetected, setFaceDetected] = useState(false);
    const [showGreeting, setShowGreeting] = useState(false);
    const greetingTimeoutRef = useRef<number | null>(null);
    const faceDetectionInitialRef = useRef(false);

    const { videoRef, result: faceResult, isLoading } = useFaceDetection(isOpen);

    // Handle face detection
    useEffect(() => {
        if (!isOpen) {
            setFaceDetected(false);
            setShowGreeting(false);
            if (greetingTimeoutRef.current) {
                clearTimeout(greetingTimeoutRef.current);
            }
            return;
        }

        if (faceResult.hasFace && !faceDetected) {
            setFaceDetected(true);
            // Show greeting when face first detected
            if (!faceDetectionInitialRef.current) {
                setShowGreeting(true);
                setIsListening(true);
                faceDetectionInitialRef.current = true;
                
                // Speak the greeting with natural Thai voice
                const greetingText = "สวัสดีค่ะ ฉันคือน้องปลาทู ผู้ช่วยท่องเที่ยวสมุทรสงคราม มีอะไรให้ช่วยไหมคะ";
                if (onSpeak) {
                    // Slight delay to feel more natural
                    setTimeout(() => {
                        onSpeak(greetingText);
                    }, 500);
                }
                
                // Auto-hide greeting message after 5 seconds
                greetingTimeoutRef.current = window.setTimeout(() => {
                    setShowGreeting(false);
                }, 5000);
            }
        } else if (!faceResult.hasFace && faceDetected) {
            setFaceDetected(false);
        }
    }, [faceResult.hasFace, isOpen, faceDetected, onSpeak]);

    // Audio visualization
    useEffect(() => {
        if (!isOpen || !isListening) return;

        const interval = setInterval(() => {
            setPulseIntensity(Math.random() * 100);
        }, 100);

        return () => clearInterval(interval);
    }, [isOpen, isListening]);

    if (!isOpen) return null;

    const orbSize = 200 + (pulseIntensity * 0.5);
    const glowIntensity = 20 + (pulseIntensity * 0.3);

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col overflow-hidden">
            {/* Keep video element for face detection but hide the preview */}
            <video
                ref={videoRef}
                className="hidden"
                autoPlay
                playsInline
                muted
            />

            {/* Close Button */}
            <div className="absolute top-6 right-6 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
                >
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Header */}
            <div className="pt-16 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-400 text-sm font-medium tracking-widest uppercase">
                        NongPlatoo Voice AI
                    </span>
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-white/60 text-sm">
                    ระบบผู้ช่วยเสียงอัจฉริยะ
                </p>
            </div>

            {/* Main Orb Container */}
            <div className="flex-1 flex items-center justify-center relative">
                {/* Background Particles */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Outer Glow Rings */}
                <div
                    className="absolute rounded-full opacity-20 animate-ping"
                    style={{
                        width: orbSize + 100,
                        height: orbSize + 100,
                        background: `radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)`,
                        animationDuration: '2s',
                    }}
                />
                <div
                    className="absolute rounded-full opacity-30"
                    style={{
                        width: orbSize + 60,
                        height: orbSize + 60,
                        background: `radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, transparent 70%)`,
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                />

                {/* Inner Rotating Ring */}
                <div
                    className="absolute rounded-full border border-cyan-400/30"
                    style={{
                        width: orbSize + 40,
                        height: orbSize + 40,
                        animation: 'spin 8s linear infinite',
                    }}
                >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full" />
                </div>

                {/* Secondary Rotating Ring */}
                <div
                    className="absolute rounded-full border border-blue-400/20"
                    style={{
                        width: orbSize + 20,
                        height: orbSize + 20,
                        animation: 'spin 6s linear infinite reverse',
                    }}
                >
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full" />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full" />
                </div>

                {/* Main Orb */}
                <div
                    className="relative rounded-full flex items-center justify-center transition-all duration-100"
                    style={{
                        width: orbSize,
                        height: orbSize,
                        background: `
              radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle, rgba(30, 58, 138, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)
            `,
                        boxShadow: `
              0 0 ${glowIntensity}px rgba(34, 211, 238, 0.5),
              0 0 ${glowIntensity * 2}px rgba(34, 211, 238, 0.3),
              0 0 ${glowIntensity * 3}px rgba(34, 211, 238, 0.1),
              inset 0 0 60px rgba(34, 211, 238, 0.1)
            `,
                    }}
                >
                    {/* Inner Core */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: orbSize * 0.7,
                            height: orbSize * 0.7,
                            background: `radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)`,
                            animation: 'pulse 2s ease-in-out infinite',
                        }}
                    />

                    {/* Voice Wave Bars */}
                    <div className="flex items-center justify-center gap-1">
                        {[...Array(7)].map((_, i) => {
                            const height = isListening
                                ? 20 + Math.sin((Date.now() / 200) + i) * 30 + (pulseIntensity * 0.3)
                                : 10;
                            return (
                                <div
                                    key={i}
                                    className="w-1.5 bg-gradient-to-t from-cyan-400 to-blue-400 rounded-full transition-all duration-75"
                                    style={{
                                        height: `${height}px`,
                                        opacity: 0.6 + (pulseIntensity / 200),
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Floating Sparkles around orb */}
                <div
                    className="absolute"
                    style={{
                        width: orbSize + 150,
                        height: orbSize + 150,
                        animation: 'spin 20s linear infinite',
                    }}
                >
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-cyan-400/50 rounded-full animate-pulse"
                            style={{
                                top: `${50 + 45 * Math.cos((i * 60 * Math.PI) / 180)}%`,
                                left: `${50 + 45 * Math.sin((i * 60 * Math.PI) / 180)}%`,
                                transform: 'translate(-50%, -50%)',
                                animationDelay: `${i * 0.2}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Status Text */}
            <div className="pb-16 text-center">
                <div className="mb-4">
                    {/* AI Greeting Message */}
                    {showGreeting && (
                        <div className="mb-4 animate-in fade-in duration-500">
                            <p className="text-cyan-300 text-lg font-medium mb-2">
                                สวัสดีค่ะ! 👋
                            </p>
                            <p className="text-white/70 text-sm">
                                ฉันคือน้องปลาทู ผู้ช่วยท่องเที่ยวสมุทรสงคราม
                            </p>
                            <p className="text-white/60 text-xs mt-1">
                                มีอะไรให้ช่วยไหมคะ
                            </p>
                        </div>
                    )}

                    <p className={`text-lg font-medium ${isListening ? 'text-cyan-400' : 'text-white/60'}`}>
                        {isListening ? 'กำลังฟังอยู่...' : 'กดเพื่อเริ่มพูด'}
                    </p>
                    <p className="text-white/40 text-sm mt-2">
                        พูดคำถามของคุณเกี่ยวกับสถานที่ท่องเที่ยวสมุทรสงคราม
                    </p>
                </div>

                {/* Control Buttons */}
                <div className="flex justify-center gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setIsListening(!isListening)}
                        className={`
              rounded-full px-8 border-2 transition-all duration-300
              ${isListening
                                ? 'border-red-400/50 text-red-400 hover:bg-red-400/10 bg-red-400/5'
                                : 'border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 bg-cyan-400/5'
                            }
            `}
                    >
                        {isListening ? 'หยุดฟัง' : 'เริ่มพูด'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VoiceAIInterface;
