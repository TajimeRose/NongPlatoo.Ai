import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechSynthesis = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const synth = useRef<SpeechSynthesis>(window.speechSynthesis);

    // Queue system
    const queueRef = useRef<string[]>([]);
    const processingQueueRef = useRef(false);

    // Load voices
    useEffect(() => {
        const updateVoices = () => {
            setVoices(synth.current.getVoices());
        };

        updateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = updateVoices;
        }
    }, []);

    // Internal speak function that processes the queue
    const processQueue = useCallback(() => {
        if (!synth.current || queueRef.current.length === 0 || processingQueueRef.current) {
            if (queueRef.current.length === 0 && !synth.current.speaking) {
                setIsSpeaking(false);
            }
            return;
        }

        processingQueueRef.current = true;
        const text = queueRef.current.shift()!;

        const utterance = new SpeechSynthesisUtterance(text);

        // ============================================
        // ENHANCED Voice Selection for Cross-Browser
        // ============================================

        // Step 1: Find all Thai voices
        const thaiVoices = voices.filter(v =>
            v.lang === 'th-TH' ||
            v.lang === 'th' ||
            v.lang.startsWith('th-') ||
            v.name.toLowerCase().includes('thai')
        );

        // Step 2: Priority selection (Best Thai Female Voices)
        let selectedVoice: SpeechSynthesisVoice | undefined;

        // Priority list (most common Thai female voices across platforms)
        const voicePriority = [
            // Chrome/Android
            (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.name.toLowerCase().includes('thai'),
            // Windows 11
            (v: SpeechSynthesisVoice) => v.name.includes('Premwadee'),
            // macOS/iOS
            (v: SpeechSynthesisVoice) => v.name.includes('Narisa'),
            (v: SpeechSynthesisVoice) => v.name.includes('Kanya'),
            // Edge Neural
            (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('neural') && v.lang.includes('th'),
            // Generic female
            (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('female'),
            // Samsung
            (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('samsung'),
        ];

        for (const matcher of voicePriority) {
            selectedVoice = thaiVoices.find(matcher);
            if (selectedVoice) break;
        }

        // Fallback: Any Thai voice
        if (!selectedVoice && thaiVoices.length > 0) {
            selectedVoice = thaiVoices[0];
        }

        // Step 3: Apply voice settings
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`🎤 Using Thai voice: "${selectedVoice.name}" (${selectedVoice.lang})`);
        } else {
            // No Thai voice available - log warning and use browser default
            console.warn('⚠️ No Thai voice found! Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        }

        // CRITICAL: Always set language to Thai even if no Thai voice found
        // This helps the browser attempt to pronounce Thai text correctly
        utterance.lang = 'th-TH';

        // Natural human speed and pitch
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            processingQueueRef.current = false;
            processQueue(); // Process next
        };
        utterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            processingQueueRef.current = false;
            setIsSpeaking(false);
            processQueue(); // Skip to next
        };

        synth.current.speak(utterance);
    }, [voices]);

    const speak = useCallback((text: string, force = false) => {
        if (force) {
            // Urgent message (e.g. error, stop), clear queue
            queueRef.current = [];
            if (synth.current) synth.current.cancel();
            processingQueueRef.current = false;
        }

        queueRef.current.push(text);

        if (!processingQueueRef.current && !synth.current.speaking) {
            processQueue();
        }
    }, [processQueue]);

    const cancel = useCallback(() => {
        queueRef.current = [];
        processingQueueRef.current = false;
        if (synth.current) {
            synth.current.cancel();
            setIsSpeaking(false);
        }
    }, []);

    return {
        speak,
        cancel,
        isSpeaking,
        hasSupport: 'speechSynthesis' in window
    };
};
