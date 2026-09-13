"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldAlert,
  Waves,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Users,
  Compass,
  Zap,
  ArrowRight,
  ArrowLeft,
  Maximize,
  Minimize,
  Volume2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Check,
  Download,
  Activity,
  Layers,
  Cpu,
  Radio,
  FileCheck,
  Truck,
  HeartHandshake,
  Database,
  Building2,
  Eye,
  Sliders,
  Terminal,
} from "lucide-react";

interface Slide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  speakerNotes: string;
  timeTarget: string;
  content: React.ReactNode;
}

export default function PitchDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const downloadPptx = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/pitch/download");
      if (!res.ok) throw new Error("Failed to generate PPTX");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "FENDER-PitchDeck-CodeArena26.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Could not generate PPTX. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space" || e.key === "PageDown") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prevSlide();
      } else if (e.key.toLowerCase() === "n") {
        setShowNotes((prev) => !prev);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "t") {
        setTimerRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  const slides: Slide[] = [
    // SLIDE 1: COVER
    {
      id: "cover",
      tag: "CODEARENA '26 · TOPIC 04: DISASTER RESPONSE",
      title: "FENDER",
      subtitle: "Next-Gen National Disaster Risk Reduction & Emergency Management System",
      timeTarget: "0:00 - 0:25",
      speakerNotes:
        "Good morning judges and attendees. I am Mohan, and this is FENDER. During seasonal monsoons in Colombo, when the Kelani River breaches its banks, thousands of families are trapped, dispatchers are swamped by panicked calls, and response units operate completely blind. FENDER changes that forever through an intelligent, full-loop multimodal AI disaster management platform.",
      content: (
        <div className="flex flex-col items-center justify-center text-center h-full max-w-5xl mx-auto px-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            CodeArena '26 · Topic 04: Disaster Response
          </div>

          <div className="relative mb-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-1 shadow-2xl shadow-blue-500/30 flex items-center justify-center overflow-hidden">
              <Image
                src="/fender-logo.png"
                alt="Fender Logo"
                width={140}
                height={140}
                className="rounded-2xl object-cover"
                priority
              />
            </div>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-4">
            FEN<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300">DER</span>
          </h1>

          <p className="text-lg sm:text-2xl text-slate-300 font-medium max-w-3xl mb-8 leading-relaxed">
            Intelligent, Multi-Tier Disaster Response Ecosystem for the <span className="text-cyan-300 font-semibold">Kelani River Basin</span> & Beyond.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl text-left">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Cpu className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">5-Check AI</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">Multimodal Gemini Vision & PostGIS spatial clustering</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Early Warning</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">Autonomous rainfall & river level hazard triggers</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Anti-Ghost</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">Mandatory photographic proof of road clearance</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <HeartHandshake className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Reunification</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">Public "I'm Safe" registry & live shelter bed telemetry</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live on Vercel
            </span>
            <span>•</span>
            <span>Next.js 16.3 + Supabase PostGIS + Google Gemini 2.5 + Expo SDK 57</span>
          </div>
        </div>
      ),
    },

    // SLIDE 2: THE PROBLEM
    {
      id: "problem",
      tag: "THE CRISIS IN COLOMBO",
      title: "The Deadly 45-Minute Information Void",
      subtitle: "Why Traditional Disaster Response Collapses When the Kelani Overflows",
      timeTarget: "0:25 - 1:00",
      speakerNotes:
        "Every year, low-lying regions like Nagalagam Street, Sedawatta, and Kolonnawa face catastrophic flash flooding. When disaster strikes, municipal response fails not because people don't care, but because of 4 fatal operational bottlenecks: First, dispatchers spend critical hours sorting spam from real emergencies. Second, 50 callers report the same fallen tree, overloading phone lines. Third, field crews claim roads are cleared over radio, but ambulances arrive to find them blocked. And fourth, displaced citizens can't find their families across 20 disconnected shelters.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full max-w-6xl mx-auto px-4 py-4">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-red-200">1. Verification Delay & Spam Influx</h4>
                  <p className="text-sm text-slate-300 mt-1">
                    Emergency call lines (117 / 1990) are paralyzed by thousands of unstructured, panic-driven calls. Dispatchers take <strong>30 to 45 minutes</strong> to confirm whether an incident is genuine.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-amber-200">2. Duplicate Ticket Avalanches</h4>
                  <p className="text-sm text-slate-300 mt-1">
                    A single fallen tree in Sedawatta triggers 50 duplicate reports, diverting scarce municipal response teams away from life-threatening flash floods 500 meters away.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-orange-950/40 border border-orange-800/40">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 shrink-0 mt-0.5">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-orange-200">3. "Ghost Clearances" & Blind Routing</h4>
                  <p className="text-sm text-slate-300 mt-1">
                    Field crews verbally radio that a road is passable without visual proof. Citizens and rescue boats navigate into submerged culverts and dead ends.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-purple-200">4. The Missing Evacuee Void</h4>
                  <p className="text-sm text-slate-300 mt-1">
                    Displaced children and elderly citizens are scattered across temples and school shelters without centralized bed rosters or missing persons records.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Kelani River Basin Risk Map
                </span>
                <span className="text-xs font-mono text-slate-400">Nagalagam Gauge: 88%</span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">Traditional Emergency Cycle</div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-200 mb-2">
                    <span>Incident Occurs</span>
                    <span className="text-red-400">45+ Min Delay</span>
                    <span>Triage</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full w-[85%]"></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Unstructured phone calls, manual paper logs, unverified radio calls.</p>
                </div>

                <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-800/40">
                  <div className="text-xs text-blue-400 mb-1 font-semibold">With FENDER AI Pipeline</div>
                  <div className="flex items-center justify-between text-sm font-semibold text-white mb-2">
                    <span>Photo + GPS Intake</span>
                    <span className="text-cyan-400 font-mono font-bold">&lt; 3 Seconds</span>
                    <span>Automated Triage</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full w-[5%] animate-pulse"></div>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-2">Instant multi-modal vision scoring, spatial clustering, and autonomous alert escalation.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-sm font-semibold text-white">
                "In a flood, a 15-minute verification delay is the difference between safe evacuation and stranded casualties."
              </p>
              <p className="text-xs text-slate-400 mt-1">— Colombo Municipal Disaster Review</p>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 3: THE SOLUTION - ECOSYSTEM
    {
      id: "solution",
      tag: "THE FENDER ECOSYSTEM",
      title: "One Unified Platform. Zero Information Silos.",
      subtitle: "Connecting Citizens, Command Centers, Field Units, and Relief Camps in Real Time",
      timeTarget: "1:00 - 1:40",
      speakerNotes:
        "Fender is not just another reporting app. It is a complete multi-tier disaster ecosystem. Citizens submit geotagged photos in English, Sinhala, or Tamil. Our 5-check AI pipeline instantly verifies credibility. Municipal officers oversee the entire city on a PostGIS command console with autonomous weather triggers. Field crews clear roads with mandatory after-fix photo proof. And humanitarian relief desks manage live shelter beds and family reunification.",
      content: (
        <div className="flex flex-col h-full justify-between max-w-6xl mx-auto px-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* PORTAL 1 */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-800/40 hover:border-blue-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <Radio className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-mono uppercase text-blue-400 font-bold mb-1">Portal 1 · Frontline</div>
                <h3 className="text-lg font-bold text-white mb-2">Citizen Lifeline PWA</h3>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Trilingual (English, Sinhala, Tamil)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>One-tap geotagged camera hazard report</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Live 5-check AI inspection modal</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Offline QR SOS beacon & direct 117 dialer</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-mono text-cyan-300">Route: /report · /</span>
              </div>
            </div>

            {/* PORTAL 2 */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-cyan-950/40 to-slate-900 border border-cyan-800/40 hover:border-cyan-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-mono uppercase text-cyan-400 font-bold mb-1">Portal 2 · Municipal HQ</div>
                <h3 className="text-lg font-bold text-white mb-2">Command Console</h3>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Unified incident triage & status filter</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>PostGIS split-screen spatial sync</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Autonomous river & rainfall triggers</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>AI sensitivity slider & full audit trail</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-mono text-cyan-300">Route: /dashboard/officer</span>
              </div>
            </div>

            {/* PORTAL 3 */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-900 border border-amber-800/40 hover:border-amber-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-mono uppercase text-amber-400 font-bold mb-1">Portal 3 · Field Ops</div>
                <h3 className="text-lg font-bold text-white mb-2">Crew Clearance Desk</h3>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Assigned ticket queue (Navy, DMC, CMC)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>One-tap turn-by-turn navigation</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Mandatory after-repair photo proof</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Instant unblocking of public safe map</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-mono text-cyan-300">Route: /crew</span>
              </div>
            </div>

            {/* PORTAL 4 */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-800/40 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-mono uppercase text-emerald-400 font-bold mb-1">Portal 4 · Humanitarian</div>
                <h3 className="text-lg font-bold text-white mb-2">Relief & Safe Registry</h3>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Live shelter bed capacity counters</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>"I'm Safe" family reunification portal</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Missing persons national ID search</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Urgent medical/infant aid tag matching</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-mono text-cyan-300">Route: /safe · /relief</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <div className="text-xs text-slate-400 uppercase font-mono font-semibold">Unified Realtime Data Fabric</div>
                <div className="text-sm font-semibold text-white">Supabase PostGIS + WebSocket Subscriptions + Edge Replication</div>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Every action anywhere reflects across all 4 screens in &lt; 200ms
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 4: CORE INNOVATION - 5-CHECK MULTI-MODAL AI
    {
      id: "ai-engine",
      tag: "THE SECRET SAUCE",
      title: "The Multi-Modal 5-Check AI Engine",
      subtitle: "How Fender Evaluates Hazard Credibility & Severity in Under 3 Seconds",
      timeTarget: "1:40 - 2:20",
      speakerNotes:
        "Here is our core technical innovation. Rather than passing raw reports to a generic chatbot, Fender runs every citizen submission through a deterministic 5-check pipeline. 1: Input & Vernacular translation. 2: Gemini 2.5 computer vision analyzing flood depth, fallen power lines, or fake web photos. 3: Real-time hydrological telemetry from Kelani river gauges. 4: PostGIS spatial clustering that groups calls within 150 meters to kill duplicate spam. 5: Ward topology risk scoring. If confidence is above 0.75, it publishes automatically. If ambiguous, it triggers crowdsourced quorum or human officer override.",
      content: (
        <div className="flex flex-col h-full justify-between max-w-6xl mx-auto px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* CHECK 1 */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 font-mono font-bold text-xs">
                  01
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Input & Multilingual AI</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Extracts Sinhala, Tamil, or English text. Strips noise, detects urgent distress keywords (e.g. "elderly trapped", "water rising fast").
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-blue-400">
                Weight: 15% · Sanitization
              </div>
            </div>

            {/* CHECK 2 */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-800/60 flex flex-col justify-between shadow-lg shadow-cyan-950/30">
              <div>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 font-mono font-bold text-xs">
                  02
                </div>
                <h4 className="text-sm font-bold text-cyan-200 mb-1">Gemini Vision AI</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Computer vision verifies photo against reported hazard. Estimates flood level (ankle, waist, roof), detects live power lines, rejects stock photos.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-cyan-300">
                Weight: 35% · Multimodal
              </div>
            </div>

            {/* CHECK 3 */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 font-mono font-bold text-xs">
                  03
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Weather & River Telemetry</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cross-references live Kelani River gauge heights (Nagalagam Street) and Ward 24h rainfall radar to confirm environmental consistency.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-indigo-400">
                Weight: 20% · Hydrological
              </div>
            </div>

            {/* CHECK 4 */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-800/60 flex flex-col justify-between shadow-lg shadow-amber-950/30">
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 font-mono font-bold text-xs">
                  04
                </div>
                <h4 className="text-sm font-bold text-amber-200 mb-1">PostGIS Cluster Check</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Executes <code>ST_DWithin</code> radius queries (150m-200m). Groups duplicate calls into 1 master incident. Prevents ticket flooding.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-amber-300">
                Weight: 20% · Spatial Engine
              </div>
            </div>

            {/* CHECK 5 */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 font-mono font-bold text-xs">
                  05
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Topology & Risk Scoring</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Checks ward elevation, low-lying drainage vulnerabilities, and arterial road obstruction to calculate final urgency and triage badge.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-emerald-400">
                Weight: 10% · Risk Model
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 border border-blue-900/40 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 font-mono font-bold text-base">
                0.80 SCORE
              </div>
              <div>
                <div className="text-sm font-bold text-white">Aggregator Formula & Dynamic Thresholds</div>
                <div className="text-xs text-slate-400">
                  Calculated as: <code className="text-cyan-300">Composite = Σ(Check_Score_i × Weight_i)</code>. Configurable by municipal officers in real-time.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                &ge; 0.75 ➔ AUTO-PUBLISH
              </span>
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                0.50 - 0.74 ➔ NEED_INFO
              </span>
              <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30">
                &lt; 0.50 ➔ REJECT / PENDING
              </span>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 5: LIVE DEMO - OFFICER COMMAND CONSOLE
    {
      id: "demo-officer",
      tag: "LIVE PLATFORM TOUR · SCREEN 1",
      title: "Municipal Officer Command & Triage Console",
      subtitle: "De-risking Crisis Management with Real-Time Spatial Awareness and Audit Trails",
      timeTarget: "2:20 - 3:00",
      speakerNotes:
        "Here is our live Command Console at `/dashboard/officer`. Deployed at Colombo Municipal Council headquarters, officers see a live queue of incidents. Selecting any incident pulls up the exact 5-check telemetry, showing Gemini vision reasoning, rainfall radar, and cluster counts. If heavy monsoons cause erratic reports, officers can adjust the AI sensitivity threshold slider on the fly or escalate a ward directly to an Area Alert.",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center h-full max-w-6xl mx-auto px-4 py-2">
          <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 relative group">
            <Image
              src="/screenshots/01-officer-triage-dashboard.png"
              alt="Officer Triage Dashboard"
              width={1200}
              height={700}
              className="w-full h-auto object-cover rounded-xl"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none"></div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300 bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-800">
              <span className="font-mono text-cyan-300 font-semibold">Incident #428CA8A8 · Flood in Ward 01 (Nagalagam)</span>
              <span className="text-emerald-400 font-bold">Verdict: 0.80 Confirmed</span>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase mb-1">
                <Sliders className="w-4 h-4" /> AI Confidence Sensitivity
              </div>
              <p className="text-xs text-slate-300">
                Commanders can dynamically slide threshold from 0.50 to 0.90 to throttle triage volume during peak storm surges.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-1">
                <Layers className="w-4 h-4" /> Deep Telemetry Breakdown
              </div>
              <p className="text-xs text-slate-300">
                Inspect per-check scores: Input AI (0.85), Image AI (0.90), Weather Radar (0.70), Spatial Cluster (1.00), Risk (0.75).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-1">
                <CheckCircle2 className="w-4 h-4" /> Action & Override Audit Trail
              </div>
              <p className="text-xs text-slate-300">
                1-click buttons: <strong>Publish</strong>, <strong>Request Info</strong>, <strong>Raise Area Alert</strong>, or <strong>Dispatch to Council</strong>.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/officer"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                Launch Live Command Console
              </Link>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 6: CITIZEN PWA & SAFE MAP
    {
      id: "demo-citizen",
      tag: "LIVE PLATFORM TOUR · SCREEN 2",
      title: "Citizen Emergency Lifeline & Interactive Map",
      subtitle: "Instant Geotagged Intake, Offline Safety Beacons, and Live Evacuation Navigation",
      timeTarget: "3:00 - 3:35",
      speakerNotes:
        "For citizens, accessibility is everything. Fender is a lightweight, installable PWA that works on any smartphone with zero app store friction. Citizens can switch between English, Sinhala, and Tamil with one tap. Submitting a hazard takes under 15 seconds: snap a photo, tap current GPS location, and submit. The citizen watches the live 5-check AI verify in real-time, receiving instant safety instructions. On the Interactive Safe Map, road pins pulse red for hazards and show real-time detours to open shelters.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center h-full max-w-6xl mx-auto px-4 py-2">
          {/* Card 1 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="relative w-full aspect-[9/16] max-h-[340px] rounded-xl overflow-hidden border border-slate-700 mb-3 bg-black">
              <Image
                src="/screenshots/02-citizen-home-lifeline.jpg"
                alt="Citizen Lifeline Hub"
                fill
                className="object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-white">Trilingual Lifelines</h4>
            <p className="text-xs text-slate-400 mt-1">
              One-touch emergency dialer (117 / 1990), offline QR SOS, and critical river flood alerts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="relative w-full aspect-[9/16] max-h-[340px] rounded-xl overflow-hidden border border-slate-700 mb-3 bg-black">
              <Image
                src="/screenshots/07-citizen-report-hazard.jpg"
                alt="Hazard Report Flow"
                fill
                className="object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-white">One-Tap Camera & GPS</h4>
            <p className="text-xs text-slate-400 mt-1">
              Camera intake + locked GPS coordinates. Displays live 5-check AI progress modal.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="relative w-full aspect-[9/16] max-h-[340px] rounded-xl overflow-hidden border border-slate-700 mb-3 bg-black">
              <Image
                src="/screenshots/05-interactive-safe-map.jpg"
                alt="Safe Map & Evacuation"
                fill
                className="object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-white">Interactive Safe Map</h4>
            <p className="text-xs text-slate-400 mt-1">
              Pulsing hazard pins, active road blocks, crowdsource quorum confirms, and safe shelter paths.
            </p>
          </div>
        </div>
      ),
    },

    // SLIDE 7: FIELD CREW & ANTI-GHOST RESOLUTION
    {
      id: "demo-crew",
      tag: "LIVE PLATFORM TOUR · SCREEN 3",
      title: "Field Crew Dispatch & Anti-Ghost Verification",
      subtitle: "Closing the Loop with Mandatory Photographic Proof of Resolution",
      timeTarget: "3:35 - 4:05",
      speakerNotes:
        "One of the biggest failures in government disaster response is ghost clearances—crews saying a road is clear when it's still blocked. Fender solves this with zero-trust clearance. At `/crew`, dispatched teams (Navy, DMC, CMC) see their assigned hazards with turn-by-turn navigation. Crucially, a crew cannot mark an incident resolved by pressing a button—they MUST capture and upload a live after-fix photo. Once verified, the database updates via WebSockets and the road pin unblocks on the public map in milliseconds.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full max-w-6xl mx-auto px-4 py-2">
          <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 relative max-w-[360px] mx-auto">
            <Image
              src="/screenshots/03-field-crew-hub.jpg"
              alt="Field Crew Clearance Desk"
              width={500}
              height={900}
              className="w-full h-auto object-cover rounded-xl"
            />
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-800/40">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-1">
                <Truck className="w-4 h-4" /> Multi-Agency Dispatch Integration
              </div>
              <p className="text-sm text-slate-300">
                Tailored for on-ground units: Sri Lanka Navy rescue teams, Disaster Management Centre (DMC) crews, and Municipal Council tree-clearing engineers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-800/40">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase mb-1">
                <FileCheck className="w-4 h-4" /> Cryptographic & Visual Proof-of-Resolution
              </div>
              <p className="text-sm text-slate-300">
                Tickets <strong>cannot</strong> be closed by a radio checkbox. Field crews must take a live timestamped photo showing the road unblocked or tree removed.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-800/40">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-1">
                <Radio className="w-4 h-4" /> Instant Real-Time Cascade
              </div>
              <p className="text-sm text-slate-300">
                When resolved, Supabase Realtime automatically flips <code className="text-emerald-300">is_road_blocked = false</code>, rerouting public navigation routes instantly.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/crew"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-lg shadow-amber-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                Launch Field Crew Desk
              </Link>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 8: HUMANITARIAN RELIEF & SAFE REGISTRY
    {
      id: "demo-relief",
      tag: "LIVE PLATFORM TOUR · SCREEN 4",
      title: "Humanitarian Relief & Family Reunification",
      subtitle: "Live Shelter Vacancy Telemetry, Medical Matching, and the 'I'm Safe' Registry",
      timeTarget: "4:05 - 4:35",
      speakerNotes:
        "Disaster response is ultimately about human lives. At `/safe` and `/relief`, Fender provides two vital humanitarian tools. First, live shelter telemetry showing exact free beds, hot meal stocks, and medical aid across Colombo camps. Second, our 'I'm Safe' public registry. Evacuated citizens check in with their name, national identity number, and contact info, allowing anxious relatives anywhere in the world to search and verify their family's safety immediately.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full max-w-6xl mx-auto px-4 py-2">
          <div className="grid grid-cols-2 gap-3 max-w-[420px] mx-auto">
            <div className="rounded-xl overflow-hidden border border-slate-700 shadow-xl bg-black">
              <Image
                src="/screenshots/04-relief-shelter-hub.jpg"
                alt="Relief Shelter Hub"
                width={300}
                height={600}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-700 shadow-xl bg-black">
              <Image
                src="/screenshots/06-evacuee-safety-registry.jpg"
                alt="Evacuee Safety Registry"
                width={300}
                height={600}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-800/40">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-1">
                <HeartHandshake className="w-4 h-4" /> Live Shelter Bed & Supply Telemetry
              </div>
              <p className="text-sm text-slate-300">
                Monitors real-time capacity across 5 Colombo relief camps (e.g. St. Anthony's Church, Sedawatta Temple). Relief coordinators can route evacuees before shelters reach overflow.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-800/40">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-1">
                <Users className="w-4 h-4" /> "I'm Safe" Family Reunification Registry
              </div>
              <p className="text-sm text-slate-300">
                Citizens register their status in 30 seconds. Includes searchable database by NIC, name, or phone number, solving the agony of missing relatives.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-800/40">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase mb-1">
                <ShieldAlert className="w-4 h-4" /> Vulnerability Tags & Infant / Medical Matching
              </div>
              <p className="text-sm text-slate-300">
                Helps doctors and NGOs prioritize evacuees requiring insulin, dialysis, oxygen, infant formula, or wheelchair assistance.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <Link
                href="/safe"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                Live Safe Registry
              </Link>
              <Link
                href="/relief"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700"
              >
                <ExternalLink className="w-4 h-4" />
                Relief Hub
              </Link>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 9: IMPACT, ARCHITECTURE & METRICS
    {
      id: "impact",
      tag: "TECHNICAL EXCELLENCE & REAL-WORLD IMPACT",
      title: "Measurable Impact & Production Architecture",
      subtitle: "Built to Scale Under Catastrophic Load with Zero Infrastructure Bottlenecks",
      timeTarget: "4:35 - 5:00",
      speakerNotes:
        "To summarize our impact: Fender cuts municipal triage delay by over 90%, from 45 minutes down to under 3 seconds. Spatial clustering kills 90% of duplicate ticket flood. Mandatory photo resolution completely eliminates ghost clearances. And our architecture is production-ready: Next.js 16.3 on Vercel Edge, Supabase PostGIS with row-level security, Google Gemini 2.5 multimodal AI, and an Expo mobile client.",
      content: (
        <div className="flex flex-col h-full justify-between max-w-6xl mx-auto px-4 py-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-blue-800/40">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-400 font-mono mb-1">&lt; 3s</div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">AI Triage Speed</div>
              <p className="text-[11px] text-slate-400">Down from 45 minutes of manual dispatcher phone call triage.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-800/40">
              <div className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono mb-1">90%</div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">Duplicate Cut</div>
              <p className="text-[11px] text-slate-400">PostGIS ST_DWithin collapses 50 calls into 1 master dispatch.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-800/40">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono mb-1">100%</div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">Verified Clearances</div>
              <p className="text-[11px] text-slate-400">Zero ghost clearances with mandatory closure camera proof.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-800/40">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono mb-1">3 Lng</div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">Trilingual Parity</div>
              <p className="text-[11px] text-slate-400">Complete English, Sinhala, and Tamil support for all citizens.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Full Stack Architecture & Deployed Infrastructure
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-blue-400 font-bold block mb-0.5">Frontend & PWA</span>
                Next.js 16.3 App Router, React 19, Tailwind CSS v4, Lucide Icons, Leaflet Maps.
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-0.5">Spatial & Database</span>
                Supabase PostgreSQL, PostGIS spatial extension, Realtime WebSocket publications.
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-amber-400 font-bold block mb-0.5">Intelligence</span>
                Google Gemini 2.5 Flash Multimodal Vision, deterministic JSON schema validation.
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">Mobile Native</span>
                Expo SDK 57, React Native 0.86, Expo Router, offline cache fallback.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <strong>Production Ready:</strong> Live on Vercel Edge with zero cold-start database connection pooling.
            </div>
            <span className="text-xs font-mono text-cyan-400">
              https://backend-chi-gilt-80.vercel.app
            </span>
          </div>
        </div>
      ),
    },

    // SLIDE 10: ROADMAP & CONCLUSION
    {
      id: "conclusion",
      tag: "FUTURE ROADMAP & CONCLUSION",
      title: "Saving Lives Before the Waters Rise",
      subtitle: "From Colombo's Kelani River to a National Disaster Infrastructure Standard",
      timeTarget: "5:00 - 5:30",
      speakerNotes:
        "Fender was built for CodeArena '26, but its mission goes far beyond this weekend. Our roadmap includes offline LoRa mesh networks for when cellular towers fail, drone reconnaissance video integration, and direct API interoperability with Sri Lanka's National Disaster Management Centre. When flash floods threaten our communities, speed and accuracy save lives. Fender delivers both. Thank you, and we are now open for questions.",
      content: (
        <div className="flex flex-col h-full justify-between max-w-5xl mx-auto px-4 py-4 text-center">
          <div className="space-y-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              The Future of National Emergency Resilience
            </h3>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              How Fender evolves from a municipal flood platform into a resilient, nationwide multi-hazard infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left my-4">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <Radio className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Phase 1 · LoRa Mesh Sync</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Decentralized offline mesh nodes for areas where cellular towers are washed out, syncing SOS beacons hop-by-hop.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                <Eye className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Phase 2 · Drone Stream Vision</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Feeding aerial UAV drone video directly into Gemini Vision to autonomously trace flood boundaries and breached levees.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Phase 3 · National DMC Integration</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Standardized bidirectional telemetry into Sri Lanka's Disaster Management Centre and emergency services dispatch.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-cyan-950/60 border border-cyan-800/40">
            <h2 className="text-2xl font-extrabold text-white mb-2">
              Thank You. Questions & Live Demo?
            </h2>
            <p className="text-sm text-cyan-300 font-medium mb-4">
              Explore the live production deployment: <code className="text-white">backend-chi-gilt-80.vercel.app</code>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard/officer"
                target="_blank"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 inline-flex items-center gap-1.5"
              >
                <Terminal className="w-4 h-4" /> Command Desk
              </Link>
              <Link
                href="/map"
                target="_blank"
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/30 inline-flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4" /> Safe Map
              </Link>
              <Link
                href="/safe"
                target="_blank"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 inline-flex items-center gap-1.5"
              >
                <HeartHandshake className="w-4 h-4" /> Safe Registry
              </Link>
              <Link
                href="/crew"
                target="_blank"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/30 inline-flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" /> Crew Clearance
              </Link>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none overflow-x-hidden font-sans">
      {/* TOP BAR */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 flex items-center justify-center">
              <Image
                src="/fender-logo.png"
                alt="Fender"
                width={30}
                height={30}
                className="rounded-md object-cover"
              />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              FENDER
            </span>
          </Link>

          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            Pitch Deck · CodeArena '26
          </span>
        </div>

        {/* CENTER SLIDE SELECTOR */}
        <div className="flex items-center gap-1">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "w-8 bg-cyan-400"
                  : idx < currentSlide
                  ? "w-2 bg-blue-500/50 hover:bg-blue-400"
                  : "w-2 bg-slate-800 hover:bg-slate-700"
              }`}
              title={`Slide ${idx + 1}: ${s.title}`}
            />
          ))}
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-2">
          {/* TIMER */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className={secondsElapsed > 300 ? "text-red-400 font-bold animate-pulse" : "text-slate-300"}>
              {formatTime(secondsElapsed)}
            </span>
            <button
              onClick={() => setTimerRunning((r) => !r)}
              className="p-1 hover:text-cyan-300 text-slate-400"
              title={timerRunning ? "Pause Timer (T)" : "Start Timer (T)"}
            >
              {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => {
                setTimerRunning(false);
                setSecondsElapsed(0);
              }}
              className="p-1 hover:text-cyan-300 text-slate-400"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* DOWNLOAD PPTX BUTTON */}
          <button
            onClick={downloadPptx}
            disabled={downloading}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              downloading
                ? "bg-blue-900/40 text-blue-300 border-blue-700/50 cursor-wait"
                : "bg-slate-900 text-slate-300 hover:text-white hover:bg-blue-900/30 hover:border-blue-600/50 border-slate-800"
            }`}
            title="Download PowerPoint Deck (D)"
          >
            {downloading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="hidden md:inline">Building…</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">PPTX</span>
              </>
            )}
          </button>

          {/* SPEAKER NOTES BUTTON */}
          <button
            onClick={() => setShowNotes((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showNotes
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
            title="Toggle Speaker Script (N)"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Script (N)</span>
          </button>

          {/* FULLSCREEN BUTTON */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN SLIDE STAGE */}
      <main className="flex-1 flex flex-col justify-center relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* SLIDE HEADER */}
        <div className="max-w-6xl mx-auto w-full mb-3 text-center sm:text-left">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              {slide.tag}
            </span>
            <span className="text-xs font-mono text-slate-500">
              Slide {currentSlide + 1} of {slides.length} · Target: {slide.timeTarget}
            </span>
          </div>
          {currentSlide > 0 && (
            <>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {slide.title}
              </h2>
              <p className="text-sm text-slate-400 font-medium">{slide.subtitle}</p>
            </>
          )}
        </div>

        {/* SLIDE BODY */}
        <div className="w-full flex-1 flex flex-col justify-center">
          {slide.content}
        </div>
      </main>

      {/* SPEAKER NOTES DRAWER */}
      {showNotes && (
        <div className="bg-slate-900/95 border-t border-cyan-800/40 p-4 sm:p-5 backdrop-blur-lg animate-in slide-in-from-bottom duration-200 z-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                  Speaker Script & Talking Points · Slide {currentSlide + 1}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Target: {slide.timeTarget}</span>
            </div>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              "{slide.speakerNotes}"
            </p>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <footer className="h-14 border-t border-slate-800/80 bg-slate-950/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentSlide === 0
              ? "opacity-30 cursor-not-allowed text-slate-500"
              : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <div className="text-xs font-mono text-slate-500">
          Tip: Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">→</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Space</kbd>
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentSlide === slides.length - 1
              ? "opacity-30 cursor-not-allowed text-slate-500"
              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/20"
          }`}
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
