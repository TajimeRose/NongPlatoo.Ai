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

        // Better voice selection: Thai Language + Female preference
        // Specific known female Thai voices across OS
        const thaiVoices = voices.filter(v => v.lang.includes('th') || v.lang === 'th-TH');

        let selectedVoice = thaiVoices.find(v => v.name.includes('Google') && v.name.includes('Thai')); // Google Thai (Female)
        if (!selectedVoice) selectedVoice = thaiVoices.find(v => v.name.includes('Narisa')); // Mac/iOS (Female)
        if (!selectedVoice) selectedVoice = thaiVoices.find(v => v.name.includes('Premwadee')); // Windows (Female)
        if (!selectedVoice) selectedVoice = thaiVoices.find(v => v.name.toLowerCase().includes('female')); // Generic Female
        if (!selectedVoice) selectedVoice = thaiVoices.find(v => v.name.toLowerCase().includes('neural')); // Edge Neural (High Quality)
        if (!selectedVoice) selectedVoice = thaiVoices[0]; // Any Thai fallback

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        // Natural human speed and pitch
        utterance.rate = 1.0; // 1.0 = Normal human speed
        utterance.pitch = 1.0; // 1.0 = Natural pitch (no artificial shifting)

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            processingQueueRef.current = false;
            processQueue(); // Process next
        };
        utterance.onerror = () => {
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
