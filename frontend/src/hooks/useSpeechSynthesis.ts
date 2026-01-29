import { useState, useCallback, useRef, useEffect } from 'react';

// Global AudioContext to persist across re-renders and component mounts
// This is crucial for iOS to maintain the "unlocked" state
let globalAudioContext: AudioContext | null = null;
let isUnlocked = false;

const getAudioContext = () => {
    if (!globalAudioContext) {
        // Fallback for older browsers (unlikely needed for modern iOS but good practice)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            globalAudioContext = new AudioContextClass();
        }
    }
    return globalAudioContext;
};

/**
 * useSpeechSynthesis - iOS Compatible Edition (Web Audio API)
 * 
 * Uses OpenAI TTS API and plays back using Web Audio API (AudioContext).
 * This solves the iOS auto-play restriction by "unlocking" the AudioContext
 * on the first user interaction.
 */
export const useSpeechSynthesis = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentSentence, setCurrentSentence] = useState<string | null>(null);

    // Queue system
    const queueRef = useRef<string[]>([]);
    const prefetchQueueRef = useRef<Map<string, ArrayBuffer>>(new Map()); // Store buffers, not blobs
    const processingRef = useRef(false);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Unlock Audio Context on mount (or first interaction)
    const unlockAudioContext = useCallback(() => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                isUnlocked = true;
                console.log('AudioContext resumed/unlocked');
            }).catch(e => console.error('Failed to resume AudioContext', e));
        } else if (ctx && !isUnlocked) {
            // Force unlock for iOS by playing silent buffer
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            isUnlocked = true;
            console.log('AudioContext forced unlocked');
        }
    }, []);

    // Helper to fetch audio as ArrayBuffer
    const fetchAudio = async (text: string, signal?: AbortSignal): Promise<ArrayBuffer> => {
        // Check cache
        if (prefetchQueueRef.current.has(text)) {
            const buffer = prefetchQueueRef.current.get(text)!;
            prefetchQueueRef.current.delete(text);
            return buffer;
        }

        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts) {
            try {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text
                    }),
                    signal: signal
                });

                if (!response.ok) {
                    throw new Error(`TTS API error: ${response.status}`);
                }

                const data = await response.json();
                if (!data.success || !data.audio) {
                    throw new Error(data.error || 'No audio returned');
                }

                // Decode base64 to ArrayBuffer
                const binaryString = window.atob(data.audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes.buffer;

            } catch (e) {
                if (signal?.aborted) throw e;
                attempt++;
                if (attempt >= maxAttempts) throw e;
                await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }
        throw new Error('Failed to fetch TTS');
    };

    // Trigger pre-fetch
    const triggerPrefetch = useCallback(() => {
        if (queueRef.current.length > 0) {
            const nextText = queueRef.current[0];
            if (!prefetchQueueRef.current.has(nextText)) {
                fetchAudio(nextText)
                    .then(buffer => {
                        prefetchQueueRef.current.set(nextText, buffer);
                    })
                    .catch(e => console.warn('Prefetch failed', e));
            }
        }
    }, []);

    // Play AudioBuffer using Web Audio API
    const playAudioBuffer = async (arrayBuffer: ArrayBuffer): Promise<void> => {
        const ctx = getAudioContext();
        if (!ctx) throw new Error('AudioContext not supported');

        // Ensure context is running
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // Decode audio data
        // Note: decodeAudioData detaches the arrayBuffer, so we use a slice if reusing (though we consume it here)
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

        return new Promise((resolve, reject) => {
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            source.onended = () => {
                currentSourceRef.current = null;
                resolve();
            };

            currentSourceRef.current = source;
            source.start(0);
        });
    };

    // Process queue
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

        // Prefetch next
        triggerPrefetch();

        try {
            abortControllerRef.current = new AbortController();

            // Fetch
            const arrayBuffer = await fetchAudio(text, abortControllerRef.current.signal);

            // Play
            if (!abortControllerRef.current.signal.aborted) {
                await playAudioBuffer(arrayBuffer);
            }

        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log('🛑 TTS playback cancelled');
            } else {
                console.error('TTS error:', error);
            }
        } finally {
            processingRef.current = false;
            currentSourceRef.current = null;
            abortControllerRef.current = null;

            // Next
            processQueue();
        }
    }, [triggerPrefetch]);

    // Public API
    const speak = useCallback((text: string, force = false) => {
        // Ideally unlock on every user-initiated interaction just in case
        unlockAudioContext();

        if (force) {
            // Cancel current
            queueRef.current = [];
            setCurrentSentence(null);

            if (currentSourceRef.current) {
                try {
                    currentSourceRef.current.stop();
                    currentSourceRef.current.disconnect();
                } catch (e) {
                    // ignore if already stopped
                }
                currentSourceRef.current = null;
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            processingRef.current = false;
        }

        queueRef.current.push(text);

        if (!processingRef.current) {
            processQueue();
        }
    }, [processQueue, unlockAudioContext]);

    const cancel = useCallback(() => {
        queueRef.current = [];
        processingRef.current = false;
        setCurrentSentence(null);

        if (currentSourceRef.current) {
            try {
                currentSourceRef.current.stop();
                currentSourceRef.current.disconnect();
            } catch (e) { }
            currentSourceRef.current = null;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setIsSpeaking(false);
    }, []);

    // Helper to check if browser supports Web Audio API (almost all do)
    const hasSupport = typeof window !== 'undefined' &&
        (!!(window.AudioContext || (window as any).webkitAudioContext));

    return {
        speak,
        cancel,
        isSpeaking,
        currentSentence,
        hasSupport
    };
};

