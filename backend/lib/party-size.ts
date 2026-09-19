const MAX_PARTY = 40;

const PATTERNS: RegExp[] = [
  /\[STRANDED:\s*(\d+)/i,
  /family\s+of\s+(\d+)/i,
  /(\d+)\s*(?:people|persons|person|evacuees|stranded|trapped)/i,
  /(\d+)\s*(?:adults?|kids?|children|infants?)/i,
  /(\d+)\s*beds?\b/i,
];

export function parsePartySize(...texts: Array<string | null | undefined>): number {
  const text = texts.filter(Boolean).join(" ");
  if (!text.trim()) return 1;

  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const count = Number(match[1]);
    if (Number.isInteger(count) && count >= 1 && count <= MAX_PARTY) {
      return count;
    }
  }

  return 1;
}

export function bedsForParty(partySize: number, freeBeds: number): number {
  const needed = Math.min(MAX_PARTY, Math.max(1, partySize));
  return Math.min(needed, Math.max(1, freeBeds));
}
