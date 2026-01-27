import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface FaceDetectionResult {
  hasFace: boolean;
  detections: number;
  error?: string;
}

export const useFaceDetection = (enabled: boolean = true) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [result, setResult] = useState<FaceDetectionResult>({ hasFace: false, detections: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectionIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load face-api.js models
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const loadModels = async () => {
      try {
        console.log("📦 Loading face-api.js models...");
        
        // Load tiny face detector model (fastest, most reliable)
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        
        console.log("✅ Face detection models loaded successfully!");
        setModelsLoaded(true);
        setIsLoading(false);
      } catch (error: unknown) {
        console.error("❌ Failed to load face detection models:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setResult((prev) => ({
          ...prev,
          error: `Model loading failed: ${errorMessage}`,
        }));
        setIsLoading(false);
      }
    };

    loadModels();
  }, [enabled]);

  // Initialize camera
  useEffect(() => {
    if (!enabled || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    console.log("🎥 Requesting camera access...");

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })
      .then((stream) => {
        console.log("✅ Camera access granted:", stream.getVideoTracks()[0].label);
        streamRef.current = stream;
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
          console.log("✅ Video metadata loaded");
          video.play()
            .then(() => {
              console.log("✅ Video playing successfully");
              setCameraReady(true);
            })
            .catch((playError) => {
              console.error("❌ Video play error:", playError);
              setResult((prev) => ({
                ...prev,
                error: "Video playback failed",
              }));
            });
        };
      })
      .catch((error) => {
        console.error("❌ Camera access error:", error.name, error.message);
        setResult((prev) => ({
          ...prev,
          error: error.name === "NotAllowedError"
            ? "Camera access denied"
            : error.name === "NotFoundError"
              ? "No camera found"
              : "Camera unavailable",
        }));
      });

    // Cleanup
    return () => {
      if (streamRef.current) {
        console.log("🛑 Stopping camera stream");
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  // Start face detection loop
  useEffect(() => {
    if (!enabled || !modelsLoaded || !cameraReady || !videoRef.current) {
      console.log("⏳ Waiting for:", { 
        enabled, 
        modelsLoaded, 
        cameraReady, 
        hasVideo: !!videoRef.current 
      });
      return;
    }

    const video = videoRef.current;
    console.log("🚀 Starting face detection loop with face-api.js");

    const detectFaces = async () => {
      try {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          // Detect faces using TinyFaceDetector (fastest option)
          const detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224, // Smaller = faster
              scoreThreshold: 0.5, // Confidence threshold
            })
          );

          setResult({
            hasFace: detections.length > 0,
            detections: detections.length,
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Face detection error:", errorMessage);
        setResult((prev) => ({
          ...prev,
          error: "Detection error",
        }));
      }
    };

    // Run detection every 100ms (~10 FPS)
    detectionIntervalRef.current = window.setInterval(detectFaces, 100);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [enabled, modelsLoaded, cameraReady]);

  return {
    videoRef,
    canvasRef,
    result,
    isLoading,
  };
};
