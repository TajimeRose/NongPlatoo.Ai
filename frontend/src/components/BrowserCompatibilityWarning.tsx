/**
 * Browser Compatibility Warning Component
 * Shows users what features are available/unavailable on their device
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import {
  BrowserCapabilities,
  detectBrowserCapabilities,
  getWarningMessages,
  getSupportedFeaturesText,
} from '@/utils/browserCapabilities';

interface BrowserCompatibilityWarningProps {
  onClose?: () => void;
  showOnceOnly?: boolean;
  minimized?: boolean;
}

/**
 * Displays browser compatibility warnings and supported features
 */
export const BrowserCompatibilityWarning: React.FC<
  BrowserCompatibilityWarningProps
> = ({ onClose, showOnceOnly = true, minimized = false }) => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(
    null
  );
  const [isOpen, setIsOpen] = useState(!minimized);
  const [isMinimized, setIsMinimized] = useState(minimized);

  useEffect(() => {
    const caps = detectBrowserCapabilities();
    setCapabilities(caps);

    // Don't show for desktop Chrome/Edge (they have all features)
    if (
      caps.isChrome &&
      !caps.isAndroid &&
      !caps.isIPad &&
      caps.canUseVoiceAI &&
      caps.tts
    ) {
      setIsOpen(false);
    }
  }, []);

  if (!capabilities || !isOpen) {
    if (!isOpen && !minimized) {
      return null;
    }

    if (isMinimized && !isOpen) {
      return (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-700 flex items-center gap-1.5 text-xs border border-gray-300 transition-colors"
            title="View device compatibility info"
          >
            <Info className="w-3 h-3" />
            <span className="hidden sm:inline">Device</span>
          </button>
        </div>
      );
    }

    return null;
  }

  const warnings = getWarningMessages();
  const supportedFeatures = getSupportedFeaturesText();
  const hasWarnings = warnings.length > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div
        className={`rounded-lg shadow-xl border ${
          hasWarnings
            ? 'bg-amber-50 border-amber-200'
            : 'bg-blue-50 border-blue-200'
        } p-4`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {hasWarnings ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
            <h3
              className={`font-semibold ${
                hasWarnings ? 'text-amber-900' : 'text-blue-900'
              }`}
            >
              {hasWarnings ? 'Feature Limitations' : 'Device Compatibility'}
            </h3>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className="mb-4 space-y-2">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className="text-sm text-amber-800 flex items-start gap-2"
              >
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Supported Features */}
        <div>
          <h4
            className={`font-medium text-sm mb-2 ${
              hasWarnings ? 'text-amber-900' : 'text-blue-900'
            }`}
          >
            Available Features:
          </h4>
          <div className="space-y-1 text-sm">
            {supportedFeatures.map((feature, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 ${
                  feature.startsWith('✅')
                    ? 'text-green-700'
                    : feature.startsWith('❌')
                      ? 'text-red-700'
                      : 'text-amber-700'
                }`}
              >
                {feature.startsWith('✅') && (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                )}
                {feature.startsWith('❌') && (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {feature.startsWith('⚠️') && (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* iPad-specific help */}
        {capabilities.isIPad && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <h4 className="font-medium text-sm text-amber-900 mb-2">
              iPad Tips:
            </h4>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              <li>Text chat works perfectly ✓</li>
              <li>AI responses work perfectly ✓</li>
              <li>
                For audio: tap the play button to unlock sound first
              </li>
              <li>Speech input is not available on iPad Safari</li>
              <li>Voice AI features won't work due to no speech input</li>
            </ul>
          </div>
        )}

        {/* Collapse button */}
        {!minimized && (
          <button
            onClick={() => {
              setIsMinimized(true);
              setIsOpen(false);
            }}
            className="mt-3 w-full text-xs text-gray-600 hover:text-gray-700 py-1 border-t border-amber-200 pt-2"
          >
            Minimize
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Smaller badge version for showing device incompatibilities
 */
export const FeatureBadge: React.FC<{
  feature: 'speech-recognition' | 'voice-ai' | 'face-detection';
  size?: 'sm' | 'md';
}> = ({ feature, size = 'md' }) => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(
    null
  );

  useEffect(() => {
    setCapabilities(detectBrowserCapabilities());
  }, []);

  if (!capabilities) return null;

  let isSupported = false;
  let label = '';

  switch (feature) {
    case 'speech-recognition':
      isSupported = capabilities.canUseSpeechRecognition;
      label = 'Speech Recognition';
      break;
    case 'voice-ai':
      isSupported = capabilities.canUseVoiceAI;
      label = 'Voice AI';
      break;
    case 'face-detection':
      isSupported = capabilities.canUseFaceDetection;
      label = 'Face Detection';
      break;
  }

  if (!isSupported) {
    const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';
    const reason =
      capabilities.isIPad && feature !== 'face-detection'
        ? 'Not on iPad'
        : 'Not supported on this browser';

    return (
      <div className={`${sizeClass} bg-red-100 text-red-700 rounded-full inline-flex items-center gap-1`} title={reason}>
        <XCircle className="w-3 h-3" />
        {label}
      </div>
    );
  }

  return (
    <div className={`${size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'} bg-green-100 text-green-700 rounded-full inline-flex items-center gap-1`}>
      <CheckCircle2 className="w-3 h-3" />
      {label}
    </div>
  );
};

export default BrowserCompatibilityWarning;
