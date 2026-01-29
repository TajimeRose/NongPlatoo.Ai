"""
Voice Activity Detection (VAD) Service
Detects when user stops speaking for natural conversation flow.

Uses WebRTC VAD for real-time speech detection with minimal latency.
Falls back to energy-based detection if WebRTC VAD is unavailable.
"""

import numpy as np
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

try:
    import webrtcvad  # type: ignore
    VAD_AVAILABLE = True
    logger.info("✓ webrtcvad loaded successfully")
except ImportError:
    VAD_AVAILABLE = False
    logger.warning("✗ webrtcvad not installed - VAD will use fallback energy detection")
    logger.warning("  Note: webrtcvad requires C++ build tools on Windows")
    logger.warning("  Install: https://visualstudio.microsoft.com/visual-cpp-build-tools/")
    logger.warning("  Or use energy-based detection (included by default)")


class VoiceActivityDetector:
    """
    Real-time voice activity detection with multiple fallback strategies.
    
    Primary: WebRTC VAD (industry standard, low latency)
    Fallback: Energy-based detection (when WebRTC unavailable)
    """
    
    def __init__(self, aggressiveness: int = 2, sample_rate: int = 16000):
        """
        Initialize VAD with specified aggressiveness.
        
        Args:
            aggressiveness: 0-3, higher = more aggressive filtering (less sensitive)
                0 = Quality mode (detects more speech, some noise)
                1 = Low bitrate (balanced)
                2 = Aggressive (recommended for most cases)
                3 = Very aggressive (only clear speech)
            sample_rate: Audio sample rate in Hz (8000, 16000, 32000, or 48000)
        """
        self.aggressiveness = aggressiveness
        self.sample_rate = sample_rate
        self.vad = None
        
        if VAD_AVAILABLE:
            try:
                self.vad = webrtcvad.Vad(aggressiveness)
                logger.info(f"VAD initialized with aggressiveness={aggressiveness}, sample_rate={sample_rate}")
            except Exception as e:
                logger.warning(f"Failed to initialize WebRTC VAD: {e}. Using fallback.")
                self.vad = None
        
        # Fallback: Energy-based detection parameters
        self.energy_threshold = 0.01  # Minimum energy to consider as speech
        self.silence_duration_threshold = 1.0  # Seconds of silence to consider speech ended
        self.min_speech_duration = 0.3  # Minimum speech duration to be valid
        
        # State tracking
        self.silence_frames = 0
        self.speech_frames = 0
        self.is_speaking = False
        
    def is_speech(self, audio_chunk: bytes, sample_rate: Optional[int] = None) -> bool:
        """
        Detect if audio chunk contains speech.
        
        Args:
            audio_chunk: Raw audio bytes (PCM 16-bit)
            sample_rate: Override sample rate for this chunk
            
        Returns:
            True if speech detected, False if silence/noise
        """
        if sample_rate is None:
            sample_rate = self.sample_rate
            
        # Validate sample rate
        if sample_rate not in [8000, 16000, 32000, 48000]:
            logger.warning(f"Invalid sample rate {sample_rate}, using 16000")
            sample_rate = 16000
        
        # Validate chunk length (must be 10, 20, or 30ms)
        frame_duration_ms = len(audio_chunk) / (sample_rate * 2) * 1000  # 2 bytes per sample
        if not (9 <= frame_duration_ms <= 31):
            logger.debug(f"Invalid frame duration {frame_duration_ms}ms, padding/truncating")
            audio_chunk = self._adjust_chunk_length(audio_chunk, sample_rate, 30)  # 30ms default
        
        # Try WebRTC VAD first
        if self.vad is not None:
            try:
                return self.vad.is_speech(audio_chunk, sample_rate)
            except Exception as e:
                logger.warning(f"WebRTC VAD failed: {e}, using fallback")
                self.vad = None  # Disable for future calls
        
        # Fallback: Energy-based detection
        return self._energy_based_detection(audio_chunk)
    
    def _adjust_chunk_length(self, audio_chunk: bytes, sample_rate: int, duration_ms: int) -> bytes:
        """Adjust audio chunk to correct length for VAD (10, 20, or 30ms)."""
        bytes_per_sample = 2  # 16-bit PCM
        required_length = int(sample_rate * (duration_ms / 1000.0) * bytes_per_sample)
        
        if len(audio_chunk) < required_length:
            # Pad with zeros
            return audio_chunk + b'\x00' * (required_length - len(audio_chunk))
        else:
            # Truncate
            return audio_chunk[:required_length]
    
    def _energy_based_detection(self, audio_chunk: bytes) -> bool:
        """
        Fallback speech detection using energy levels.
        Simple but effective for quiet environments.
        """
        try:
            # Convert bytes to numpy array
            audio_array = np.frombuffer(audio_chunk, dtype=np.int16)
            
            # Normalize to [-1, 1]
            audio_normalized = audio_array.astype(np.float32) / 32768.0
            
            # Calculate RMS energy
            energy = np.sqrt(np.mean(audio_normalized ** 2))
            
            # Detect speech based on energy threshold
            return energy > self.energy_threshold
            
        except Exception as e:
            logger.error(f"Energy detection failed: {e}")
            return False  # Assume silence on error
    
    def detect_speech_end(
        self, 
        audio_chunk: bytes, 
        sample_rate: Optional[int] = None,
        silence_threshold_seconds: float = 1.0
    ) -> Tuple[bool, bool]:
        """
        Detect if user has finished speaking based on silence duration.
        
        Args:
            audio_chunk: Raw audio bytes
            sample_rate: Sample rate (default: 16000)
            silence_threshold_seconds: How many seconds of silence = speech end
            
        Returns:
            (is_currently_speaking, speech_has_ended)
            
        Example:
            >>> vad = VoiceActivityDetector()
            >>> is_speaking, has_ended = vad.detect_speech_end(audio_chunk)
            >>> if has_ended:
            ...     print("User finished speaking!")
        """
        if sample_rate is None:
            sample_rate = self.sample_rate
        
        # Detect if current chunk has speech
        has_speech = self.is_speech(audio_chunk, sample_rate)
        
        # Calculate frame duration (assuming 30ms chunks)
        frame_duration_s = 0.03  # 30ms = 0.03s
        silence_frames_threshold = int(silence_threshold_seconds / frame_duration_s)
        
        if has_speech:
            # Speech detected
            self.speech_frames += 1
            self.silence_frames = 0
            self.is_speaking = True
            return True, False  # Speaking, not ended
        else:
            # Silence detected
            if self.is_speaking:
                self.silence_frames += 1
                
                # Check if silence duration exceeds threshold
                if self.silence_frames >= silence_frames_threshold:
                    # Speech has ended
                    speech_ended = self.speech_frames > 0  # Only if there was actual speech
                    
                    # Reset state
                    self.is_speaking = False
                    self.speech_frames = 0
                    self.silence_frames = 0
                    
                    return False, speech_ended
                else:
                    # Still in silence buffer, consider as speaking
                    return True, False
            else:
                # Was already silent, still silent
                return False, False
    
    def reset(self):
        """Reset VAD state (call when starting new conversation)."""
        self.silence_frames = 0
        self.speech_frames = 0
        self.is_speaking = False
        logger.debug("VAD state reset")


# Singleton instance for reuse
_vad_instance: Optional[VoiceActivityDetector] = None


def get_vad(aggressiveness: int = 2) -> VoiceActivityDetector:
    """
    Get or create singleton VAD instance.
    
    Args:
        aggressiveness: 0-3, VAD sensitivity (2 recommended)
        
    Returns:
        VoiceActivityDetector instance
    """
    global _vad_instance
    
    if _vad_instance is None:
        _vad_instance = VoiceActivityDetector(aggressiveness=aggressiveness)
        logger.info("Created singleton VAD instance")
    
    return _vad_instance


def check_vad_availability() -> dict:
    """
    Check which VAD methods are available.
    
    Returns:
        dict with availability status
    """
    return {
        'webrtc_vad': VAD_AVAILABLE,
        'energy_fallback': True,  # Always available
        'recommended_method': 'webrtc' if VAD_AVAILABLE else 'energy'
    }
