/**
 * Voice Activity Detection (VAD) Hook
 * Auto-detects when user stops speaking for natural conversations
 */

import { useRef, useCallback, useEffect } from 'react';

interface VADConfig {
  onSpeechEnd?: (hasContent: boolean) => void;
  onSpeechStart?: () => void;
  silenceThreshold?: number; // seconds of silence before considering speech ended
  checkInterval?: number; // ms between VAD checks
  sampleRate?: number;
  aggressiveness?: number; // 0-3
  enabled?: boolean;
}

interface VADHookReturn {
  startVAD: () => Promise<void>;
  stopVAD: () => void;
  isDetecting: boolean;
  isSpeaking: boolean;
  error: string | null;
}

/**
 * Hook for real-time voice activity detection
 * 
 * @example
 * const { startVAD, stopVAD, isSpeaking } = useVAD({
 *   onSpeechEnd: (hasContent) => {
 *     if (hasContent) processAudio();
 *   },
 *   silenceThreshold: 1.5 // seconds
 * });
 */
export const useVAD = (config: VADConfig = {}): VADHookReturn => {
  const {
    onSpeechEnd,
    onSpeechStart,
    silenceThreshold = 1.0,
    checkInterval = 100,
    sampleRate = 16000,
    aggressiveness = 2,
    enabled = true
  } = config;

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  
  const isDetectingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceStartTimeRef = useRef<number | null>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const hasDetectedSpeechRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  // Use client-side energy detection as fallback
  const detectSpeechEnergy = useCallback((audioData: Float32Array): boolean => {
    // Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    
    // Threshold for speech detection (tuned for typical mic input)
    const energyThreshold = 0.01;
    
    return rms > energyThreshold;
  }, []);

  const checkVADStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/vad/status');
      const data = await response.json();
      return data.success && data.available;
    } catch (error) {
      console.warn('[VAD] Server VAD not available, using client-side detection');
      return false;
    }
  }, []);

  const stopVAD = useCallback(() => {
    console.log('[VAD] Stopping detection');
    
    // Clear interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Reset state
    isDetectingRef.current = false;
    isSpeakingRef.current = false;
    silenceStartTimeRef.current = null;
    speechStartTimeRef.current = null;
    hasDetectedSpeechRef.current = false;
  }, []);

  const startVAD = useCallback(async () => {
    if (!enabled) {
      console.log('[VAD] Disabled by config');
      return;
    }

    console.log('[VAD] Starting detection');
    
    try {
      // Check if VAD is available (optional - will fallback to energy detection)
      await checkVADStatus();
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode for audio analysis
      // Note: This is deprecated but widely supported. TODO: Migrate to AudioWorklet
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (event) => {
        if (!enabled || !isDetectingRef.current) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Client-side energy detection (fast, no server roundtrip)
        const hasSpeech = detectSpeechEnergy(inputData);
        
        const now = Date.now();
        
        if (hasSpeech) {
          // Speech detected
          if (!isSpeakingRef.current) {
            console.log('[VAD] Speech started');
            isSpeakingRef.current = true;
            speechStartTimeRef.current = now;
            hasDetectedSpeechRef.current = true;
            
            if (onSpeechStart) {
              onSpeechStart();
            }
          }
          
          // Reset silence timer
          silenceStartTimeRef.current = null;
        } else {
          // Silence detected
          if (isSpeakingRef.current) {
            // Was speaking, now silent
            if (!silenceStartTimeRef.current) {
              silenceStartTimeRef.current = now;
            }
            
            const silenceDuration = (now - silenceStartTimeRef.current) / 1000;
            
            if (silenceDuration >= silenceThreshold) {
              console.log('[VAD] Speech ended (silence detected)');
              isSpeakingRef.current = false;
              
              if (onSpeechEnd) {
                onSpeechEnd(hasDetectedSpeechRef.current);
              }
              
              // Reset for next speech
              hasDetectedSpeechRef.current = false;
              silenceStartTimeRef.current = null;
              speechStartTimeRef.current = null;
            }
          }
        }
      };
      
      // Connect nodes (route to silent gain to avoid mic echo/feedback)
      const zeroGain = audioContext.createGain();
      zeroGain.gain.value = 0;
      source.connect(processor);
      processor.connect(zeroGain);
      zeroGain.connect(audioContext.destination);
      
      isDetectingRef.current = true;
      errorRef.current = null;
      
      console.log('[VAD] Detection started successfully');
      
    } catch (error) {
      console.error('[VAD] Failed to start:', error);
      errorRef.current = (error as Error).message;
      stopVAD();
      throw error;
    }
  }, [enabled, sampleRate, silenceThreshold, onSpeechEnd, onSpeechStart, detectSpeechEnergy, checkVADStatus, stopVAD]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVAD();
    };
  }, [stopVAD]);

  return {
    startVAD,
    stopVAD,
    isDetecting: isDetectingRef.current,
    isSpeaking: isSpeakingRef.current,
    error: errorRef.current
  };
};

export default useVAD;
