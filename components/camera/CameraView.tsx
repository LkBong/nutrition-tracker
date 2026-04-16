"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";
import { Camera, ScanLine, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FoodResult {
  id: string;
  name: string;
  brand?: string;
  calories_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  serving_size_g?: number;
}

interface Props {
  onFoodFound: (foods: FoodResult[]) => void;
  onClose: () => void;
}

export default function CameraView({ onFoodFound, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        toast.error("Camera access denied. Please allow camera permissions.");
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Barcode scan loop
  useEffect(() => {
    if (!cameraReady) return;

    const reader = new BrowserMultiFormatReader();
    scanningRef.current = true;

    async function scanFrame() {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) {
        requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        const result = await reader.decodeFromCanvas(canvas);
        if (result) {
          scanningRef.current = false;
          handleBarcode(result.getText());
          return;
        }
      } catch {
        // No barcode detected, continue scanning
      }

      requestAnimationFrame(scanFrame);
    }

    requestAnimationFrame(scanFrame);

    return () => {
      scanningRef.current = false;
    };
  }, [cameraReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBarcode = useCallback(async (code: string) => {
    setScanning(true);
    toast.info(`Barcode detected: ${code}`);

    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error("Product not found");
      const food = await res.json();
      onFoodFound([food]);
    } catch {
      toast.error("Product not found in database. Try text search.");
      // Resume scanning
      scanningRef.current = true;
    } finally {
      setScanning(false);
    }
  }, [onFoodFound]);

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    setScanning(true);
    scanningRef.current = false; // Pause barcode scanning

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Failed to capture photo");
        setScanning(false);
        scanningRef.current = true;
        return;
      }

      const formData = new FormData();
      formData.append("file", blob, "photo.jpg");

      try {
        const res = await fetch("/api/food/photo", { method: "POST", body: formData });
        if (!res.ok) throw new Error("No food detected");
        const foods = await res.json();
        if (foods.length === 0) throw new Error("No food detected");
        onFoodFound(foods);
      } catch (err) {
        toast.error((err as Error).message || "Could not identify food");
        scanningRef.current = true;
      } finally {
        setScanning(false);
      }
    }, "image/jpeg", 0.85);
  }

  return (
    <div className="relative flex flex-col">
      {/* Video */}
      <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* Barcode viewfinder overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            "h-24 w-64 rounded-lg border-2 transition-colors",
            scanning ? "border-yellow-400" : "border-white/70"
          )}>
            <ScanLine className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 text-white/70" />
          </div>
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white"
          aria-label="Close camera"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Loading overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Action buttons */}
      <div className="mt-3 flex gap-3">
        <Button
          onClick={capturePhoto}
          disabled={!cameraReady || scanning}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Camera className="mr-2 h-4 w-4" />
          Identify Food
        </Button>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Point at a <strong>barcode</strong> to auto-detect, or tap{" "}
        <strong>Identify Food</strong> to analyse a photo
      </p>
    </div>
  );
}
