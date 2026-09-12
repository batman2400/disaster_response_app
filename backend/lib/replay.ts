import { loadReplaySnapshot, saveReplaySnapshot, updateWardTelemetry } from "./db";
import {
  DEFAULT_REPLAY_INTERVAL_MS,
  DEFAULT_REPLAY_WARD,
  REPLAY_CLOCK_START,
  REPLAY_TIMELINE,
  WARD_SEED,
  isWardId,
  statusFor,
} from "./replay-const";
import type { ReplayEvent, ReplayEventType, ReplayState, WardId } from "./types";

export {
  DEFAULT_REPLAY_INTERVAL_MS,
  DEFAULT_REPLAY_WARD,
  REPLAY_CLOCK_END,
  REPLAY_CLOCK_START,
  REPLAY_TIMELINE,
  WARD_SEED,
  isWardId,
  statusFor,
} from "./replay-const";

const STALE_MS = 45_000;

type ReplayBox = {
  generation: number;
  running: boolean;
  interval_ms: number;
  state: ReplayState;
};

const globalBox = globalThis as typeof globalThis & { __weatherReplay?: ReplayBox };

function idleState(wardId: WardId = DEFAULT_REPLAY_WARD): ReplayState {
  return {
    phase: "idle",
    ward_id: wardId,
    tick: 0,
    total: REPLAY_TIMELINE.length,
    started_at: null,
    finished_at: null,
    last_tick_at: null,
    clock: REPLAY_CLOCK_START,
    interval_ms: DEFAULT_REPLAY_INTERVAL_MS,
    events: [],
  };
}

function box(): ReplayBox {
  if (!globalBox.__weatherReplay) {
    globalBox.__weatherReplay = {
      generation: 0,
      running: false,
      interval_ms: DEFAULT_REPLAY_INTERVAL_MS,
      state: idleState(),
    };
  }
  return globalBox.__weatherReplay;
}

function sanitizeState(raw: ReplayState | null | undefined): ReplayState | null {
  if (!raw || !isWardId(raw.ward_id)) return null;
  const phase = raw.phase === "running" || raw.phase === "completed" ? raw.phase : "idle";
  if (phase === "running" && raw.last_tick_at && Date.now() - Date.parse(raw.last_tick_at) > STALE_MS) {
    return {
      ...raw,
      phase: raw.tick >= REPLAY_TIMELINE.length - 1 ? "completed" : "idle",
      finished_at: raw.finished_at ?? new Date().toISOString(),
    };
  }
  return { ...raw, phase, total: REPLAY_TIMELINE.length };
}

function snapshot(): ReplayState {
  return structuredClone(box().state);
}

async function persist(state: ReplayState) {
  await saveReplaySnapshot(state);
}

function makeEvent(
  step: (typeof REPLAY_TIMELINE)[number],
  status: ReplayEvent["status"],
  extra?: { message?: string; type?: ReplayEventType },
): ReplayEvent {
  return {
    at: new Date().toISOString(),
    clock: step.clock,
    message: extra?.message ?? step.message,
    type: extra?.type ?? step.type,
    rainfall_mm: step.rainfall_mm,
    river_level_pct: step.river_level_pct,
    status,
  };
}

async function applyTick(tick: number) {
  const current = box();
  const step = REPLAY_TIMELINE[tick];
  if (!step) return;
  const status = statusFor(step.rainfall_mm, step.river_level_pct);
  const previous = current.state.events[0]?.status;
  await updateWardTelemetry(current.state.ward_id, step.rainfall_mm, step.river_level_pct, status);

  const events = [makeEvent(step, status), ...current.state.events];
  if (status === "CRITICAL" && previous !== "CRITICAL") {
    events.unshift(
      makeEvent(step, status, {
        type: "alert",
        message: `AUTO-TRIGGER: area warning dispatched for ${WARD_SEED[current.state.ward_id].name}.`,
      }),
    );
  }

  current.state = {
    ...current.state,
    tick,
    clock: step.clock,
    last_tick_at: new Date().toISOString(),
    events: events.slice(0, 24),
  };
  await persist(current.state);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getReplayState(): Promise<ReplayState> {
  const current = box();
  if (current.running || current.state.phase !== "idle") {
    return snapshot();
  }
  const persisted = sanitizeState(await loadReplaySnapshot());
  if (persisted) {
    current.state = persisted;
    current.running = persisted.phase === "running";
  }
  return snapshot();
}

export async function startReplay(input?: { ward_id?: unknown; interval_ms?: unknown }) {
  const current = box();
  if (current.running) {
    return snapshot();
  }

  const wardId = isWardId(input?.ward_id) ? input.ward_id : DEFAULT_REPLAY_WARD;
  const interval =
    typeof input?.interval_ms === "number" && Number.isFinite(input.interval_ms)
      ? Math.min(15_000, Math.max(750, Math.round(input.interval_ms)))
      : DEFAULT_REPLAY_INTERVAL_MS;

  current.generation += 1;
  current.running = true;
  current.interval_ms = interval;
  current.state = {
    ...idleState(wardId),
    phase: "running",
    started_at: new Date().toISOString(),
    interval_ms: interval,
  };

  await applyTick(0);
  return snapshot();
}

export async function continueReplay(generation: number) {
  const current = box();
  for (let tick = 1; tick < REPLAY_TIMELINE.length; tick += 1) {
    if (current.generation !== generation || !current.running) return snapshot();
    await sleep(current.interval_ms);
    if (current.generation !== generation || !current.running) return snapshot();
    await applyTick(tick);
  }

  if (current.generation === generation && current.running) {
    current.running = false;
    current.state = {
      ...current.state,
      phase: "completed",
      finished_at: new Date().toISOString(),
    };
    await persist(current.state);
  }
  return snapshot();
}

export async function resetReplay() {
  const current = box();
  current.generation += 1;
  current.running = false;

  for (const [id, ward] of Object.entries(WARD_SEED) as [WardId, (typeof WARD_SEED)[WardId]][]) {
    await updateWardTelemetry(id, ward.rainfall_mm, ward.river_level_pct, ward.status);
  }

  current.state = idleState(current.state.ward_id);
  await persist(current.state);
  return snapshot();
}

export function replayGeneration() {
  return box().generation;
}
