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
 * useSpeechRecognition Hook - SIMPLIFIED VERSION
 * 
 * ✅ Uses ONLY Web Speech API (built-in to Chrome, Edge, etc.)
 * ✅ NO Whisper API calls = FAST (10-15 seconds instead of 20-25)
 * ✅ Treats voice input as regular text input
 * ✅ Instant transcription (local processing)
 * 
 * How it works:
 * 1. User speaks
 * 2. Browser's Web Speech API transcribes locally (0-1 sec)
 * 3. Text appears in input field
 * 4. Auto-submit as normal message
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

    const onResultRef = useRef(onResult);
    const onEndRef = useRef(onEnd);

    // Update refs when callbacks change
    useEffect(() => {
        onResultRef.current = onResult;
        onEndRef.current = onEnd;
    }, [onResult, onEnd]);

    // Initialize Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = continuous;
            recognition.interimResults = true;
            recognition.lang = language;

            recognition.onstart = () => {
                console.log('[Voice Input] Started listening...');
                setIsListening(true);
                setError(null);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                let interimTranscript = '';

                // Collect results from all events
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const combined = (finalTranscript + interimTranscript).trim();
                setTranscript(combined);

                // Call onResult immediately when speech is final
                if (finalTranscript && onResultRef.current) {
                    onResultRef.current(finalTranscript.trim());
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('[Voice Input] Error:', event.error);

                if (event.error === 'not-allowed') {
                    setError('❌ Microphone permission denied. Please enable microphone access.');
                } else if (event.error === 'no-speech') {
                    setError('⚠️ No speech detected. Please speak clearly and try again.');
                } else if (event.error === 'network') {
                    setError('📡 Network error. Please check your connection.');
                } else if (event.error !== 'aborted') {
                    setError(`⚠️ Error: ${event.error}`);
                }
            };

            recognition.onend = () => {
                console.log('[Voice Input] Stopped');
                setIsListening(false);
                if (onEndRef.current) {
                    onEndRef.current();
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    try {
                        recognitionRef.current.abort();
                    } catch (abortErr) {
                        // Silently ignore cleanup errors
                    }
                }
            }
        };
    }, [language, continuous]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current) {
            setError('Speech recognition not supported on this browser. Try Chrome or Edge.');
            return;
        }

        setError(null);
        setTranscript('');

        try {
            // Check if already running, if so stop it first
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore if not running
                }
            }
            
            recognitionRef.current.start();
        } catch (e) {
            console.error('[Voice Input] Failed to start:', e);
            // Only set error if it's not already running
            if ((e as any)?.message?.includes('already started')) {
                // Silently ignore - already listening
                setIsListening(true);
            } else {
                setError('Failed to start voice input. Please try again.');
            }
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.warn('[Voice Input] Error stopping:', e);
                // If stop fails, try abort as fallback
                try {
                    recognitionRef.current.abort();
                } catch (abortErr) {
                    console.warn('[Voice Input] Error aborting:', abortErr);
                }
            }
        }
    }, []);

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        hasSupport: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };
};
