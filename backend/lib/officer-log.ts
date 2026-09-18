import type { HazardRow, HazardStatus, OfficerAction, OfficerLogEntry } from "./types";

export interface OfficerLog {
  v: 1;
  log: OfficerLogEntry[];
  dispatched_at: string | null;
  assigned_crew_id?: string | null;
  assigned_crew_name?: string | null;
}

const ACTIONS: OfficerAction[] = [
  "override",
  "confirm",
  "reject",
  "crowdsource",
  "dispatch",
  "detour",
  "assign",
  "resolve",
  "alert",
];

export const OFFICER_ACTION_LABEL: Record<OfficerAction, string> = {
  override: "Note",
  confirm: "Confirm & Publish",
  reject: "Reject & Unpublish",
  crowdsource: "Revert to Crowdsource",
  dispatch: "Dispatch Crew",
  detour: "Suggest Detour",
  assign: "Assign to Shelter",
  resolve: "Resolve Hazard",
  alert: "Area Alert Broadcast",
};

function isAction(value: unknown): value is OfficerAction {
  return typeof value === "string" && ACTIONS.includes(value as OfficerAction);
}

function asEntry(value: unknown): OfficerLogEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<OfficerLogEntry>;
  if (!row.at || !isAction(row.action) || typeof row.note !== "string" || !row.status) {
    return null;
  }
  return {
    at: row.at,
    action: row.action,
    note: row.note,
    status: row.status,
  };
}

function dispatchedFrom(log: OfficerLogEntry[]): string | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    if (log[index]?.action === "dispatch") return log[index].at;
  }
  return null;
}

export function parseOfficerStored(stored: unknown, fallbackStatus: HazardStatus = "PENDING"): OfficerLog {
  if (typeof stored === "string") {
    const trimmed = stored.trim();
    if (!trimmed) return { v: 1, log: [], dispatched_at: null };
    try {
      return parseOfficerStored(JSON.parse(trimmed) as unknown, fallbackStatus);
    } catch {
      return {
        v: 1,
        log: [
          {
            at: new Date(0).toISOString(),
            action: "override",
            note: trimmed,
            status: fallbackStatus,
          },
        ],
        dispatched_at: null,
        assigned_crew_id: null,
        assigned_crew_name: null,
      };
    }
  }

  if (Array.isArray(stored)) {
    const log = stored.map(asEntry).filter((entry): entry is OfficerLogEntry => Boolean(entry));
    return { v: 1, log, dispatched_at: dispatchedFrom(log) };
  }

  if (stored && typeof stored === "object") {
    const row = stored as Partial<OfficerLog> & { officer_log?: unknown };
    const rawLog = Array.isArray(row.log) ? row.log : Array.isArray(row.officer_log) ? row.officer_log : [];
    const log = rawLog.map(asEntry).filter((entry): entry is OfficerLogEntry => Boolean(entry));
    const dispatched_at =
      typeof row.dispatched_at === "string" && row.dispatched_at ? row.dispatched_at : dispatchedFrom(log);
    return {
      v: 1,
      log,
      dispatched_at,
      assigned_crew_id: typeof row.assigned_crew_id === "string" ? row.assigned_crew_id : null,
      assigned_crew_name: typeof row.assigned_crew_name === "string" ? row.assigned_crew_name : null,
    };
  }

  return { v: 1, log: [], dispatched_at: null, assigned_crew_id: null, assigned_crew_name: null };
}

export function officerFieldsFromStored(
  stored: unknown,
  fallbackStatus?: HazardStatus,
  extras?: { officer_log?: unknown; dispatched_at?: unknown },
): Pick<HazardRow, "officer_note" | "officer_log" | "dispatched_at" | "assigned_crew_id" | "assigned_crew_name"> {
  const fromStored = parseOfficerStored(stored, fallbackStatus);
  const parsed = extras?.officer_log
    ? parseOfficerStored(
        {
          log: extras.officer_log,
          dispatched_at: extras.dispatched_at,
          assigned_crew_id: fromStored.assigned_crew_id,
          assigned_crew_name: fromStored.assigned_crew_name,
        },
        fallbackStatus,
      )
    : fromStored;
  const latest = parsed.log.at(-1)?.note;
  return {
    officer_note: latest,
    officer_log: parsed.log,
    dispatched_at: parsed.dispatched_at,
    assigned_crew_id: parsed.assigned_crew_id ?? null,
    assigned_crew_name: parsed.assigned_crew_name ?? null,
  };
}

export function serializeOfficerRow(
  row: Pick<
    HazardRow,
    "officer_note" | "officer_log" | "dispatched_at" | "status" | "assigned_crew_id" | "assigned_crew_name"
  >,
): string {
  const seeded =
    row.officer_log && row.officer_log.length > 0
      ? row.officer_log
      : row.officer_note
        ? [
            {
              at: new Date().toISOString(),
              action: "override" as const,
              note: row.officer_note,
              status: row.status,
            },
          ]
        : [];
  const payload: OfficerLog = {
    v: 1,
    log: seeded,
    dispatched_at: row.dispatched_at ?? dispatchedFrom(seeded),
    assigned_crew_id: row.assigned_crew_id ?? null,
    assigned_crew_name: row.assigned_crew_name ?? null,
  };
  return JSON.stringify(payload);
}

export function inferOfficerAction(previous: HazardStatus, next: HazardStatus): OfficerAction {
  if (next === "PUBLISHED" && previous !== "PUBLISHED") return "confirm";
  if (next === "NEED_INFO" && previous !== "NEED_INFO") return "crowdsource";
  if (next === "COUNCIL_TICKET" && previous !== "COUNCIL_TICKET") return "reject";
  return "override";
}

export function appendOfficerNote(
  existing: HazardRow,
  entry: { action: OfficerAction; note: string; status: HazardStatus },
): Pick<HazardRow, "officer_note" | "officer_log" | "dispatched_at"> {
  const prior =
    existing.officer_log && existing.officer_log.length > 0
      ? existing.officer_log
      : existing.officer_note
        ? [
            {
              at: existing.created_at,
              action: "override" as const,
              note: existing.officer_note,
              status: existing.status,
            },
          ]
        : [];
  const next: OfficerLogEntry = {
    at: new Date().toISOString(),
    action: entry.action,
    note: entry.note,
    status: entry.status,
  };
  const log = [...prior, next];
  return {
    officer_note: next.note,
    officer_log: log,
    dispatched_at: entry.action === "dispatch" ? next.at : existing.dispatched_at ?? dispatchedFrom(log),
  };
}

export function latestDispatchNote(row: Pick<HazardRow, "officer_log">): string | undefined {
  return [...(row.officer_log ?? [])].reverse().find((entry) => entry.action === "dispatch")?.note;
}
