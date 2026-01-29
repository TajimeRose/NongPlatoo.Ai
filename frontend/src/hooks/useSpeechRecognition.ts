import { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
    length: number;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: ((event: Event) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onstart: ((event: Event) => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

interface UseSpeechRecognitionProps {
    onResult?: (transcript: string) => void;
    onEnd?: () => void;
    language?: string;
    continuous?: boolean;
}

/**
 * useSpeechRecognition Hook
 * 
 * Uses Web Speech API when available, falls back to OpenAI Whisper via backend
 * when network errors occur.
 */
export const useSpeechRecognition = ({
    onResult,
    onEnd,
    language = 'th-TH',
    continuous = false
}: UseSpeechRecognitionProps = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const useWhisperFallback = useRef(false);

    const onResultRef = useRef(onResult);
    const onEndRef = useRef(onEnd);

    // Update refs when callbacks change
    useEffect(() => {
        onResultRef.current = onResult;
        onEndRef.current = onEnd;
    }, [onResult, onEnd]);

    // Whisper fallback: send audio to backend
    const sendToWhisper = useCallback(async (audioBlob: Blob) => {
        try {
            console.log('[Whisper] Sending audio to backend...', audioBlob.size, 'bytes');

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/speech-to-text', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.text) {
                console.log('[Whisper] Transcription:', data.text);
                setTranscript(data.text);
                if (onResultRef.current) {
                    onResultRef.current(data.text);
                }
            } else {
                throw new Error(data.error || 'No transcription returned');
            }
        } catch (err) {
            console.error('[Whisper] Error:', err);
            setError('ไม่สามารถแปลงเสียงเป็นข้อความได้');
        } finally {
            setIsListening(false);
            if (onEndRef.current) onEndRef.current();
        }
    }, []);

    // Start recording with MediaRecorder for Whisper fallback
    const startWhisperRecording = useCallback(async () => {
        try {
            console.log('[Whisper] Starting recording...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('[Whisper] Recording stopped, processing...');
                stream.getTracks().forEach(track => track.stop());

                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await sendToWhisper(audioBlob);
                }
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsListening(true);
            setTranscript('');
            setError(null);

            console.log('[Whisper] Recording started');

        } catch (err) {
            console.error('[Whisper] Failed to start recording:', err);
            setError('ไม่สามารถเข้าถึงไมโครโฟนได้');
            setIsListening(false);
        }
    }, [sendToWhisper]);

    // Initialize Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition && !useWhisperFallback.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = continuous;
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onstart = () => {
                console.log('[SpeechRecognition] Started');
                setIsListening(true);
                setError(null);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                console.log('[SpeechRecognition] Result:', { finalTranscript, interimTranscript });
                setTranscript(currentTranscript);

                if (onResultRef.current && finalTranscript) {
                    console.log('[SpeechRecognition] Calling onResult with:', finalTranscript);
                    onResultRef.current(finalTranscript);
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('[SpeechRecognition] Error:', event.error);

                // If network error, switch to Whisper fallback
                if (event.error === 'network' || event.error === 'service-not-allowed') {
                    console.log('[SpeechRecognition] Network error - switching to Whisper fallback');
                    useWhisperFallback.current = true;
                    // Trigger fallback immediately
                    startWhisperRecording();
                } else if (event.error === 'not-allowed') {
                    setError('กรุณาอนุญาตการเข้าถึงไมโครโฟน');
                    setIsListening(false);
                } else if (event.error === 'no-speech') {
                    // Ignore no-speech error (just silence)
                    console.log('[SpeechRecognition] No speech detected (silence)');
                } else if (event.error !== 'aborted') {
                    setError(`เกิดข้อผิดพลาด: ${event.error}`);
                }
            };

            recognition.onend = () => {
                console.log('[SpeechRecognition] Ended');

                // If we switched to whisper, don't update state here as startWhisperRecording handles it
                if (useWhisperFallback.current) {
                    return;
                }

                setIsListening(false);
                if (onEndRef.current) onEndRef.current();
            };

            recognitionRef.current = recognition;
        } else if (!SpeechRecognition) {
            console.warn('[SpeechRecognition] Not supported, will use Whisper fallback');
            useWhisperFallback.current = true;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [language, continuous, startWhisperRecording]);

    const startListening = useCallback(() => {
        setError(null);

        // Use Whisper fallback if Web Speech API failed previously
        if (useWhisperFallback.current) {
            startWhisperRecording();
            return;
        }

        // Try Web Speech API first
        if (recognitionRef.current && !isListening) {
            try {
                setTranscript('');
                recognitionRef.current.start();
            } catch (e) {
                console.error("[SpeechRecognition] Failed to start:", e);
                // Fallback to Whisper
                useWhisperFallback.current = true;
                startWhisperRecording();
            }
        } else if (!recognitionRef.current) {
            // No Web Speech API, use Whisper
            startWhisperRecording();
        }
    }, [isListening, startWhisperRecording]);

    const stopListening = useCallback(() => {
        // Stop Web Speech API
        if (recognitionRef.current && isListening && !useWhisperFallback.current) {
            recognitionRef.current.stop();
        }

        // Stop MediaRecorder for Whisper
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('[Whisper] Stopping recording...');
            mediaRecorderRef.current.stop();
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        isUsingWhisper: useWhisperFallback.current,
        hasSupport: !!(window.SpeechRecognition || window.webkitSpeechRecognition) || true // Always has support with Whisper fallback
    };
};
