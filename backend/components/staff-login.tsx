"use client";

import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, Card } from "@/components/ui";
import type { DashRole } from "@/lib/dashboard-auth";

const HOME: Record<DashRole, string> = {
  officer: "/dashboard/officer",
  relief: "/dashboard/relief",
  crew: "/crew",
};

const COPY: Record<DashRole, { title: string; blurb: string }> = {
  officer: {
    title: "Council Officer",
    blurb: "Shared desk password. Confirm tickets, override AI, and dispatch notes.",
  },
  relief: {
    title: "Relief Desk",
    blurb: "Shared desk password. Match help requests to shelters in the same ward.",
  },
  crew: {
    title: "Field Crew",
    blurb: "Shared crew password. Close tickets with an after-fix photo.",
  },
};

export function StaffLogin({ role }: { role: DashRole }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = COPY[role];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, password }),
      });
      const payload = (await response.json()) as { error?: string; next?: string; role?: DashRole };
      if (!response.ok) throw new Error(payload.error || "Login failed");
      window.location.href = payload.next ?? HOME[payload.role ?? role];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            title="Return to Home Portal"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
            <Shield className="h-6 w-6" />
          </div>
          <div className="w-10" />
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand">Fender</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{copy.title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">{copy.blurb}</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </label>
          {error ? <p className="text-sm font-semibold text-status-crimson">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full py-4">
            {busy ? "Checking…" : "Enter"}
          </Button>
        </form>

        <Link href="/" className="mt-6 block text-center text-xs font-bold text-slate-400 hover:text-brand">
          Back to role picker
        </Link>
      </Card>
    </div>
  );
}
