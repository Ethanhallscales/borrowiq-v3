/* Suburb / postcode ranking — ported from the website calculator so /start
   resolves a location to exactly the same cap key + region. */

import type { LocationRow } from "./locationCaps";

export function rankLocations(data: LocationRow[], rawQuery: string, limit = 6): LocationRow[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const isPostcodeQuery = /^\d{1,4}$/.test(q);
  let matches: LocationRow[];
  if (isPostcodeQuery) {
    matches = data.filter((r) => r[0].startsWith(q));
  } else {
    const starts = data.filter((r) => r[1].toLowerCase().startsWith(q));
    const contains = data.filter((r) => !r[1].toLowerCase().startsWith(q) && r[1].toLowerCase().includes(q));
    matches = [...starts, ...contains];
  }

  // A full postcode often has dozens of localities sharing it, which buries the actual
  // town under alphabetically-earlier suburbs. Score each candidate by how many siblings
  // contain its name (Toowoomba / East Toowoomba / Toowoomba City) and float that first.
  let rootScore: Map<LocationRow, number> | null = null;
  if (isPostcodeQuery && q.length === 4) {
    rootScore = new Map();
    const names = matches.map((r) => r[1].toLowerCase());
    matches.forEach((r, i) => {
      let count = 0;
      for (let j = 0; j < names.length; j++) {
        if (j !== i && names[j].includes(names[i])) count++;
      }
      rootScore!.set(r, count);
    });
  }

  return matches
    .slice()
    .sort((a, b) => {
      if (rootScore) {
        const diff = (rootScore.get(b) ?? 0) - (rootScore.get(a) ?? 0);
        if (diff !== 0) return diff;
      }
      const aQld = a[2] === "QLD" ? 0 : 1;
      const bQld = b[2] === "QLD" ? 0 : 1;
      if (aQld !== bQld) return aQld - bQld;
      return a[1].localeCompare(b[1]);
    })
    .slice(0, limit);
}
