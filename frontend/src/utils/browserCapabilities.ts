/**
 * Browser & Device Capability Detection
 * Detects which features are available in the current browser
 */

export interface BrowserCapabilities {
  // Basic features
  chat: boolean;
  tts: boolean; // Web Audio API available
  
  // APIs support
  speechRecognition: boolean; // Web Speech API
  mediaRecorder: boolean; // MediaRecorder API
  camera: boolean; // getUserMedia
  webgl: boolean; // For face detection
  
  // Device info
  isIOS: boolean;
  isIPad: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  
  // Derived capabilities
  canUseVoiceAI: boolean;
  canUseSpeechRecognition: boolean;
  canUseFaceDetection: boolean;
  
  // Recommendations
  recommendTTSGesture: boolean; // iOS < 14.5
}

/**
 * Detects browser and device capabilities
 * @returns BrowserCapabilities object with feature support info
 */
export const detectBrowserCapabilities = (): BrowserCapabilities => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Device detection
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isIPad = /ipad/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  
  // Browser detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isChrome = /chrome|chromium|crios/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  const isEdge = /edg/.test(userAgent);
  
  // Feature detection
  const speechRecognition = !!(
    window.SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
  
  const mediaRecorder = !!window.MediaRecorder;
  
  const camera = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
  
  const audioContext = !!(
    window.AudioContext ||
    (window as any).webkitAudioContext
  );
  
  const webgl = !!(
    window.WebGL2RenderingContext ||
    window.WebGLRenderingContext
  );
  
  // Calculate derived capabilities
  const canUseSpeechRecognition = speechRecognition && !isIPad && !isSafari;
  
  const canUseFaceDetection = webgl && camera && !isIPad;
  
  const canUseVoiceAI = canUseSpeechRecognition && camera;
  
  // iOS recommendations
  const iosVersion = getIOSVersion();
  const recommendTTSGesture = isIOS && iosVersion < 14.5;
  
  return {
    // Basic features
    chat: true, // Always works
    tts: audioContext,
    
    // APIs support
    speechRecognition,
    mediaRecorder,
    camera,
    webgl,
    
    // Device info
    isIOS,
    isIPad,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    
    // Derived capabilities
    canUseVoiceAI,
    canUseSpeechRecognition,
    canUseFaceDetection,
    
    // Recommendations
    recommendTTSGesture,
  };
};

/**
 * Get iOS version from user agent
 * @returns iOS version number, or 0 if not iOS
 */
export const getIOSVersion = (): number => {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
};

/**
 * Get Android version from user agent
 * @returns Android version number, or 0 if not Android
 */
export const getAndroidVersion = (): number => {
  const match = navigator.userAgent.match(/Android (\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
};

/**
 * Get browser version
 * @returns Major browser version number, or 0 if unable to detect
 */
export const getBrowserVersion = (): number => {
  const userAgent = navigator.userAgent;
  
  // Chrome
  let match = userAgent.match(/Chrome\/(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  // Firefox
  match = userAgent.match(/Firefox\/(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  // Safari
  match = userAgent.match(/Version\/(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  // Edge
  match = userAgent.match(/Edg\/(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  return 0;
};

/**
 * Get user-friendly browser name and version
 * @returns String like "Chrome 120" or "Safari on iPad (iOS 17)"
 */
export const getBrowserInfo = (): string => {
  const capabilities = detectBrowserCapabilities();
  const version = getBrowserVersion();
  
  let browserName = "Unknown Browser";
  if (capabilities.isChrome) browserName = "Chrome";
  else if (capabilities.isFirefox) browserName = "Firefox";
  else if (capabilities.isSafari) browserName = "Safari";
  else if (capabilities.isEdge) browserName = "Edge";
  
  let deviceInfo = "Desktop";
  if (capabilities.isIPad) {
    const iosVersion = getIOSVersion();
    deviceInfo = `iPad (iOS ${iosVersion})`;
  } else if (capabilities.isAndroid) {
    const androidVersion = getAndroidVersion();
    deviceInfo = `Android ${androidVersion}`;
  }
  
  return `${browserName} ${version} on ${deviceInfo}`;
};

/**
 * Log detailed capability information to console
 */
export const logBrowserCapabilities = (): void => {
  // Only log in development mode
  if (!import.meta.env.DEV) return;
  
  const capabilities = detectBrowserCapabilities();
  
  console.group("🌐 Browser Capabilities");
  
  console.group("Device");
  console.log("iOS:", capabilities.isIOS);
  console.log("iPad:", capabilities.isIPad);
  console.log("Android:", capabilities.isAndroid);
  console.groupEnd();
  
  console.group("Browser");
  console.log("Browser Info:", getBrowserInfo());
  console.log("User Agent:", navigator.userAgent);
  console.groupEnd();
  
  console.group("Features Available");
  console.log("Chat:", capabilities.chat);
  console.log("Text-to-Speech (TTS):", capabilities.tts);
  console.log("Speech Recognition (STT):", capabilities.speechRecognition);
  console.log("Camera Access:", capabilities.camera);
  console.log("Face Detection:", capabilities.webgl);
  console.groupEnd();
  
  console.group("Recommended Features");
  console.log("Can use Voice AI:", capabilities.canUseVoiceAI);
  console.log("Can use Speech Recognition:", capabilities.canUseSpeechRecognition);
  console.log("Can use Face Detection:", capabilities.canUseFaceDetection);
  console.log("Needs TTS Gesture Unlock:", capabilities.recommendTTSGesture);
  console.groupEnd();
  
  console.groupEnd();
};

/**
 * Get supported features as readable text
 */
export const getSupportedFeaturesText = (): string[] => {
  const capabilities = detectBrowserCapabilities();
  const features: string[] = [];
  
  features.push("✅ Text Chat");
  features.push("✅ AI Responses");
  
  if (capabilities.tts) {
    features.push("✅ Text-to-Speech (Audio)");
  } else {
    features.push("❌ Text-to-Speech (Audio not supported)");
  }
  
  if (capabilities.canUseSpeechRecognition) {
    features.push("✅ Speech Recognition");
  } else if (capabilities.isIPad) {
    features.push("❌ Speech Recognition (Not supported on iPad)");
  } else if (capabilities.isSafari) {
    features.push("❌ Speech Recognition (Not supported on Safari)");
  } else {
    features.push("❌ Speech Recognition (Not supported)");
  }
  
  if (capabilities.camera) {
    features.push("✅ Camera Access");
  } else {
    features.push("❌ Camera Access");
  }
  
  if (capabilities.canUseFaceDetection) {
    features.push("✅ Face Detection");
  } else if (capabilities.isIPad) {
    features.push("⚠️ Face Detection (Slow on iPad)");
  } else if (!capabilities.camera) {
    features.push("❌ Face Detection (No camera)");
  } else {
    features.push("❌ Face Detection (Not supported)");
  }
  
  if (capabilities.canUseVoiceAI) {
    features.push("✅ Voice AI Interface");
  } else {
    features.push("❌ Voice AI Interface (Not supported)");
  }
  
  return features;
};

/**
 * Get warning messages for unsupported/problematic features
 */
export const getWarningMessages = (): string[] => {
  const capabilities = detectBrowserCapabilities();
  const warnings: string[] = [];
  
  if (capabilities.isIPad) {
    warnings.push("📱 You're using iPad - some features may be limited");
    warnings.push("❌ Speech Recognition is not available on iPad");
    warnings.push("⚠️ Voice AI features may not work well");
  }
  
  if (capabilities.isSafari && !capabilities.isIPad) {
    warnings.push("⚠️ Speech Recognition support is experimental in Safari");
  }
  
  if (capabilities.isFirefox) {
    warnings.push("⚠️ Speech Recognition not available in Firefox");
  }
  
  if (capabilities.recommendTTSGesture) {
    warnings.push("📢 Please tap the screen to enable audio playback");
  }
  
  if (capabilities.isIPad && capabilities.webgl) {
    warnings.push("⚠️ Face Detection may be slow on iPad");
  }
  
  return warnings;
};

export default {
  detectBrowserCapabilities,
  getIOSVersion,
  getAndroidVersion,
  getBrowserVersion,
  getBrowserInfo,
  logBrowserCapabilities,
  getSupportedFeaturesText,
  getWarningMessages,
};
