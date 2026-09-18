"use client";

import {
  AlertCircle,
  Archive,
  ArrowRight,
  Camera,
  CheckCircle2,
  Database,
  Loader2,
  MapPin,
  QrCode,
  Radio,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wifi,
  X,
} from "lucide-react";
import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import {
  clearMuleVault,
  getMuleBeacons,
  removeMuleBeacon,
  saveMuleBeacon,
  syncMuleBeacons,
} from "@/lib/offline-mule";
import type { DataMuleBeacon } from "@/lib/types";
import { timeAgo, wardShort } from "@/lib/format";

interface MuleScannerModalProps {
  open: boolean;
  onClose: () => void;
  crewId?: string;
  onBeaconCaptured?: (beacon: DataMuleBeacon) => void;
  onBeaconsRelayed?: (count: number) => void;
  initialTab?: "scan" | "vault";
}

export function MuleScannerModal({
  open,
  onClose,
  crewId = "crew_general_01",
  onBeaconCaptured,
  onBeaconsRelayed,
  initialTab = "scan",
}: MuleScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "vault">(initialTab);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBeacon, setCapturedBeacon] = useState<DataMuleBeacon | null>(null);
  const [vaultBeacons, setVaultBeacons] = useState<DataMuleBeacon[]>([]);
  const [isRelaying, setIsRelaying] = useState(false);
  const [relayFeedback, setRelayFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const refreshVault = async () => {
    try {
      const beacons = await getMuleBeacons();
      setVaultBeacons(beacons);
    } catch {
      setVaultBeacons([]);
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCapturedBeacon(null);
      setCameraError(null);
      setRelayFeedback(null);
      return;
    }

    setActiveTab(initialTab);
    void refreshVault();

    if (initialTab === "scan") {
      void startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, initialTab]);

  useEffect(() => {
    if (activeTab === "scan" && !capturedBeacon && open) {
      void startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab, capturedBeacon, open]);

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
        "Camera stream unavailable. Please use the image upload scanner below or click 'Simulate SOS Scan'.",
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
      void handleQrData(code.data);
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
        setRelayFeedback(null);
        await refreshVault();
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
      description: "Stranded on upper floor with 4 family members, 1 diabetic patient requiring insulin",
      estimated_people: 4,
      medical_priority: "CRITICAL",
      created_at: new Date().toISOString(),
      collected_by_crew_id: crewId,
      collected_at: new Date().toISOString(),
    };

    void saveMuleBeacon(mockBeacon).then(async () => {
      setCapturedBeacon(mockBeacon);
      setRelayFeedback(null);
      await refreshVault();
      if (onBeaconCaptured) onBeaconCaptured(mockBeacon);
    });
  }

  async function handleRelayAll() {
    setIsRelaying(true);
    setRelayFeedback(null);
    try {
      const res = await syncMuleBeacons(crewId);
      if (res.synced > 0) {
        setRelayFeedback({
          success: true,
          message: `Successfully relayed ${res.synced} offline citizen SOS beacon(s) to Municipal Command!`,
        });
        await refreshVault();
        if (onBeaconsRelayed) onBeaconsRelayed(res.synced);
      } else {
        setRelayFeedback({
          success: false,
          message: "No beacons in vault or relay failed. Check internet connection.",
        });
      }
    } catch {
      setRelayFeedback({
        success: false,
        message: "Relay failed. Beacons remain safely buffered on device storage.",
      });
    } finally {
      setIsRelaying(false);
    }
  }

  async function handleDeleteBeacon(id: string) {
    await removeMuleBeacon(id);
    await refreshVault();
    if (capturedBeacon?.id === id) {
      setCapturedBeacon(null);
    }
  }

  async function handleClearAll() {
    if (confirm("Are you sure you want to clear all buffered beacons from this device's vault?")) {
      await clearMuleVault();
      await refreshVault();
      setCapturedBeacon(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-xl">
      <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
        {/* Header (shrink-0) */}
        <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-3.5 sm:px-6 sm:py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Citizen SOS Data Mule</h3>
                <p className="text-[11px] font-bold text-slate-400">
                  Zero-Connectivity Victim Harvest & Relay
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Switcher */}
              <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700/60 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("scan");
                    setRelayFeedback(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                    activeTab === "scan"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Scanner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("vault");
                    setRelayFeedback(null);
                    void refreshVault();
                  }}
                  className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all ${
                    activeTab === "vault"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Vault</span>
                  {vaultBeacons.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-slate-900">
                      {vaultBeacons.length}
                    </span>
                  )}
                </button>
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
        </div>

        {/* Global Relay Toast / Alert (shrink-0) */}
        {relayFeedback && (
          <div
            className={`shrink-0 border-b px-4 py-3 text-xs font-bold flex items-center justify-between ${
              relayFeedback.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {relayFeedback.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{relayFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setRelayFeedback(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {/* TAB 1: SCANNER */}
          {activeTab === "scan" && (
            <div className="space-y-4">
              {capturedBeacon ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center animate-pop">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-black text-emerald-950">Citizen SOS Beacon Captured!</h4>
                  <p className="mt-1 text-xs font-semibold text-emerald-800">
                    Buffered in this device's Data Mule vault. Ready to relay to Municipal Command Center.
                  </p>

                  {/* Beacon Inspector Details */}
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-left text-xs space-y-2 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-500">Beacon ID:</span>
                      <span className="font-mono font-black text-slate-900">
                        #{capturedBeacon.id.slice(0, 16).toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                          Victim Headcount
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {capturedBeacon.estimated_people || 1} Persons
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                          Medical Urgency
                        </span>
                        <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700 uppercase">
                          {capturedBeacon.medical_priority || "CRITICAL"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Ward Sector</span>
                        <span className="font-bold text-slate-900">
                          {wardShort(capturedBeacon.ward_id)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">GPS Coords</span>
                        <span className="font-mono text-[11px] text-slate-700">
                          {capturedBeacon.lat.toFixed(4)}, {capturedBeacon.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Citizen Notes</span>
                      <p className="mt-0.5 text-xs italic text-slate-700">
                        "{capturedBeacon.description}"
                      </p>
                    </div>
                  </div>

                  {/* RELAY ACTION BUTTONS */}
                  <div className="mt-5 flex flex-col gap-2.5">
                    {/* PRIMARY RELAY BUTTON */}
                    <button
                      type="button"
                      onClick={handleRelayAll}
                      disabled={isRelaying}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                    >
                      {isRelaying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Relaying to Command Center...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="h-4 w-4 animate-pulse" />
                          <span>Relay to Municipal Command Now</span>
                        </>
                      )}
                    </button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 py-2 text-xs font-bold"
                        onClick={() => {
                          setCapturedBeacon(null);
                          setRelayFeedback(null);
                          void startCamera();
                        }}
                      >
                        Keep in Vault & Scan Next
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="py-2 text-xs font-bold"
                        onClick={() => {
                          setActiveTab("vault");
                          void refreshVault();
                        }}
                      >
                        View Vault ({vaultBeacons.length})
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Video viewfinder */}
                  <div className="relative mx-auto aspect-square w-full max-w-[320px] max-h-[260px] sm:max-h-[300px] overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-950 shadow-inner">
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

                  {/* Action buttons */}
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
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Simulate SOS Scan</span>
                    </button>
                  </div>

                  {/* Buffered vault status indicator */}
                  {vaultBeacons.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-bold text-amber-900">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-amber-600" />
                        <span>{vaultBeacons.length} beacon(s) buffered on this device</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("vault");
                          void refreshVault();
                        }}
                        className="flex items-center gap-1 text-amber-700 hover:text-amber-950 font-extrabold"
                      >
                        <span>Open Vault</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: DATA MULE VAULT (SAVED OUTPUT INSPECTOR) */}
          {activeTab === "vault" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Local Device Mule Vault</h4>
                  <p className="text-[11px] text-slate-500">
                    Offline SOS emergency beacons captured on this device
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refreshVault}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Refresh local vault"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {vaultBeacons.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Database className="h-6 w-6" />
                  </div>
                  <h5 className="text-sm font-bold text-slate-700">Vault is Empty</h5>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                    No offline beacons currently buffered on this device. Use the scanner to harvest citizen SOS beacons in zero-cell areas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("scan")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Launch Camera Scanner</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Top Relay Action Bar */}
                  <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                          {vaultBeacons.length} Offline SOS Ready to Relay
                        </span>
                      </div>
                      <span className="rounded-md bg-amber-200/60 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                        Stored in IndexedDB
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs font-medium text-amber-800">
                      When your vehicle reaches cellular network or Wi-Fi range, transmit these distress requests to the Colombo Municipal Command Center.
                    </p>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleRelayAll}
                        disabled={isRelaying}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 active:scale-95 disabled:opacity-50"
                      >
                        {isRelaying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Relaying Beacons...</span>
                          </>
                        ) : (
                          <>
                            <Radio className="h-4 w-4" />
                            <span>Relay All ({vaultBeacons.length}) to Command</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAll}
                        title="Clear all buffered beacons"
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Saved Beacons */}
                  <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                    {vaultBeacons.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-900">
                                #{b.id.slice(0, 14)}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                                {wardShort(b.ward_id)}
                              </span>
                              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700 uppercase">
                                {b.medical_priority || "CRITICAL"}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-700 font-medium">
                              "{b.description}"
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleDeleteBeacon(b.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Delete this beacon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{b.estimated_people || 1} Persons</span>
                          </span>

                          <span className="flex items-center gap-1 font-mono">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span>
                              {b.lat.toFixed(3)}, {b.lng.toFixed(3)}
                            </span>
                          </span>

                          <span>{b.created_at ? timeAgo(b.created_at) : "Recent"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

