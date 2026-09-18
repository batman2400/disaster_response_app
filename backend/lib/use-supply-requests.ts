"use client";

import { useCallback, useEffect, useState } from "react";

import type { SupplyRequest, SupplyRequestStatus } from "@/lib/types";

export function useSupplyRequests(initial: SupplyRequest[] = [], pollMs = 4000) {
  const [requests, setRequests] = useState<SupplyRequest[]>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/relief/resupply");
      if (!res.ok) return;
      const data = (await res.json()) as { requests?: SupplyRequest[] };
      setRequests(data.requests ?? []);
    } catch {
      // Keep last known list if a poll fails.
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(id);
    };
  }, [pollMs, refresh]);

  const updateStatus = useCallback(
    async (request_id: string, status: SupplyRequestStatus, officer_note?: string) => {
      const res = await fetch("/api/relief/resupply", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id, status, officer_note }),
      });
      const data = (await res.json()) as { error?: string; request?: SupplyRequest };
      if (!res.ok) throw new Error(data.error || "Update failed");
      if (data.request) {
        setRequests((prev) => prev.map((row) => (row.id === data.request!.id ? data.request! : row)));
      } else {
        await refresh();
      }
      return data.request;
    },
    [refresh],
  );

  return { requests, refresh, updateStatus };
}
