"use client";

import { AlertCircle, Camera, CheckCircle2, QrCode, Radio, Upload, X } from "lucide-react";
import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { saveMuleBeacon } from "@/lib/offline-mule";
import type { DataMuleBeacon } from "@/lib/types";

interface MuleScannerModalProps {
  open: boolean;
  onClose: () => void;
  crewId?: string;
  onBeaconCaptured?: (beacon: DataMuleBeacon) => void;
}

export function MuleScannerModal({
  open,
  onClose,
  crewId = "crew_general_01",
  onBeaconCaptured,
}: MuleScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBeacon, setCapturedBeacon] = useState<DataMuleBeacon | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCapturedBeacon(null);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open]);

  async function startCamera() {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraError(
        "Camera stream unavailable. Please use the image upload scanner below or click 'Simulate Scan'.",
      );
      setScanning(false);
    }
  }

  function stopCamera() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      for (const track of stream.getTracks()) {
        track.stop();
      }
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }

  function tick() {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      handleQrData(code.data);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }

  async function handleQrData(dataString: string) {
    try {
      const parsed = JSON.parse(dataString) as DataMuleBeacon;
      if (parsed.type === "FENDER_SOS_BEACON" && parsed.id) {
        stopCamera();
        const enriched: DataMuleBeacon = {
          ...parsed,
          collected_by_crew_id: crewId,
          collected_at: new Date().toISOString(),
        };

        await saveMuleBeacon(enriched);
        setCapturedBeacon(enriched);
        if (onBeaconCaptured) onBeaconCaptured(enriched);
      }
    } catch {
      // not a valid JSON or beacon, continue scanning
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        void handleQrData(code.data);
      } else {
        alert("No valid Fender SOS QR beacon found in uploaded image.");
      }
    };
    img.src = URL.createObjectURL(file);
  }

  function handleSimulate() {
    const mockBeacon: DataMuleBeacon = {
      id: `beacon_${Date.now()}_sim`,
      type: "FENDER_SOS_BEACON",
      lat: 6.9535,
      lng: 79.8732,
      ward_id: "ward_01",
      category: "FLOOD",
      help_request: true,
      description: "Stranded on roof with 4 family members, 1 diabetic patient requiring insulin",
      estimated_people: 4,
      medical_priority: "CRITICAL",
      created_at: new Date().toISOString(),
      collected_by_crew_id: crewId,
      collected_at: new Date().toISOString(),
    };

    void saveMuleBeacon(mockBeacon).then(() => {
      setCapturedBeacon(mockBeacon);
      if (onBeaconCaptured) onBeaconCaptured(mockBeacon);
    });
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Citizen SOS Data Mule Scanner</h3>
                <p className="text-[11px] font-bold text-slate-400">
                  Relaying Zero-Signal Stranded Victims to Command
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {capturedBeacon ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center animate-pop">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-black text-emerald-950">Citizen SOS Beacon Captured!</h4>
              <p className="mt-1 text-xs font-semibold text-emerald-800">
                Stored in Field Crew Data Mule vault. Will auto-sync to Municipal EOC when connectivity returns.
              </p>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3.5 text-left text-xs space-y-1.5 shadow-sm">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Beacon ID:</span>
                  <span className="font-mono font-black text-slate-900">{capturedBeacon.id.slice(0, 14)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Victim Headcount:</span>
                  <span className="font-extrabold text-slate-900">{capturedBeacon.estimated_people} Persons</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Urgency:</span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.2 text-[10px] font-black text-rose-700 uppercase">
                    {capturedBeacon.medical_priority}
                  </span>
                </div>
                <p className="border-t border-slate-100 pt-1.5 italic text-slate-600">
                  "{capturedBeacon.description}"
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="gradient"
                  className="flex-1 py-2 text-xs font-extrabold"
                  onClick={() => {
                    setCapturedBeacon(null);
                    void startCamera();
                  }}
                >
                  Scan Another Citizen
                </Button>
                <Button type="button" variant="ghost" className="py-2 text-xs font-bold" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Video viewfinder */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-950 shadow-inner">
                <video ref={videoRef} className="h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {scanning && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-8">
                    <div className="relative h-48 w-48 rounded-2xl border-2 border-dashed border-purple-400 shadow-2xl">
                      <div className="absolute inset-0 animate-pulse bg-purple-500/10" />
                    </div>
                    <p className="mt-4 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                      Align Citizen SOS QR inside frame
                    </p>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center text-white">
                    <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
                    <p className="text-xs font-medium text-slate-300">{cameraError}</p>
                  </div>
                )}
              </div>

              {/* Fallback actions */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95">
                  <Upload className="h-3.5 w-3.5 text-purple-600" />
                  <span>Upload QR Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleSimulate}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 p-2.5 text-xs font-bold text-purple-700 shadow-sm hover:bg-purple-100 active:scale-95"
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>Simulate SOS Scan</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
