"use client";

import { useState, type FormEvent } from "react";

import type { DashRole } from "@/lib/dashboard-auth";

export function LoginForm() {
  const [role, setRole] = useState<DashRole>("officer");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      const payload = (await response.json()) as { error?: string; role?: DashRole };
      if (!response.ok) {
        throw new Error(payload.error || "Login failed");
      }
      window.location.href = payload.role === "relief" ? "/dashboard/relief" : "/dashboard/officer";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={(event) => void onSubmit(event)}>
      <img className="dash-logo login-logo" src="/logo.png" alt="Fender" />
      <p className="dash-kicker">FENDER</p>
      <h2>Staff sign in</h2>
      <p>Shared password per desk — no user accounts. Officer confirms tickets; Relief matches shelters.</p>

      <label htmlFor="role">Desk</label>
      <select id="role" value={role} onChange={(event) => setRole(event.target.value as DashRole)}>
        <option value="officer">Council Officer</option>
        <option value="relief">Relief Coordinator</option>
      </select>

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {error ? <p className="error">{error}</p> : null}

      <button type="submit" disabled={busy}>
        {busy ? "Checking…" : "Enter dashboard"}
      </button>
    </form>
  );
}
