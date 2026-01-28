import { useState, useCallback, useRef } from 'react';

/**
 * useSpeechSynthesis - OpenAI TTS Edition
 * 
 * Uses OpenAI TTS API for consistent Thai voice across all devices.
 * Falls back to Web Speech API if OpenAI TTS fails.
 */
export const useSpeechSynthesis = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentSentence, setCurrentSentence] = useState<string | null>(null);

    // Queue system for sequential playback
    const queueRef = useRef<string[]>([]);
    const processingRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Process the queue - fetch audio from OpenAI TTS and play
    const processQueue = useCallback(async () => {
        if (queueRef.current.length === 0 || processingRef.current) {
            if (queueRef.current.length === 0) {
                setIsSpeaking(false);
            }
            return;
        }

        processingRef.current = true;
        setIsSpeaking(true);

        const text = queueRef.current.shift()!;
        setCurrentSentence(text);

        try {
            // Create abort controller for this request
            abortControllerRef.current = new AbortController();

            // Call OpenAI TTS API endpoint with retry logic
            let response;
            let attempt = 0;
            const maxAttempts = 3;

            while (attempt < maxAttempts) {
                try {
                    response = await fetch('/api/tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: text,
                            voice: 'shimmer', // Female voice, clear and distinct
                            speed: 1.25 // Optimized speed
                        }),
                        signal: abortControllerRef.current.signal
                    });

                    if (response.ok) break; // Success!

                    // If server error, maybe retry?
                    if (response.status >= 500) {
                        throw new Error(`Server error: ${response.status}`);
                    } else {
                        // Client error (4xx), don't retry
                        throw new Error(`TTS API error: ${response.status}`);
                    }
                } catch (e) {
                    attempt++;
                    console.warn(`TTS attempt ${attempt} failed:`, e);
                    if (attempt >= maxAttempts) throw e;
                    // Wait before retry (exponential backoff: 500ms, 1000ms, etc)
                    await new Promise(r => setTimeout(r, 500 * attempt));
                }
            }

            if (!response || !response.ok) {
                throw new Error('Failed to fetch TTS after retries');
            }

            const data = await response.json();

            if (!data.success || !data.audio) {
                throw new Error(data.error || 'No audio returned');
            }

            // Create audio element and play
            const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);

            audioRef.current = new Audio(audioUrl);

            await new Promise<void>((resolve, reject) => {
                if (!audioRef.current) {
                    reject(new Error('Audio element not created'));
                    return;
                }

                audioRef.current.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };

                audioRef.current.onerror = (e) => {
                    URL.revokeObjectURL(audioUrl);
                    reject(e);
                };

                audioRef.current.play().catch(reject);
            });

            console.log(`🎤 Played TTS audio (${text.length} chars)`);

        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log('🛑 TTS playback cancelled');
            } else {
                console.error('TTS error:', error);
                // Fallback to Web Speech API - DISABLED as per user request (unreliable on target devices)
                // fallbackToWebSpeech(text);
                console.warn('TTS failed and fallback is disabled');
            }
        } finally {
            processingRef.current = false;
            audioRef.current = null;
            abortControllerRef.current = null;

            // Process next in queue
            processQueue();
        }
    }, []);

    // ... (keep fallbackToWebSpeech commented out or as is)

    // Public speak function
    const speak = useCallback((text: string, force = false) => {
        if (force) {
            // Clear queue and cancel current audio
            queueRef.current = [];
            setCurrentSentence(null); // Clear text
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            window.speechSynthesis?.cancel();
            processingRef.current = false;
        }

        queueRef.current.push(text);

        if (!processingRef.current) {
            processQueue();
        }
    }, [processQueue]);

    // Cancel all speech
    const cancel = useCallback(() => {
        queueRef.current = [];
        processingRef.current = false;
        setCurrentSentence(null);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        speak,
        cancel,
        isSpeaking,
        currentSentence, // Export this
        hasSupport: true
    };
};

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}
