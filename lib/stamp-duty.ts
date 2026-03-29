/**
 * Australian stamp duty rates by state.
 * All rates stored here so they can be updated from an admin panel later.
 */

import type { AustralianState } from "./types";

export interface DutyBracket {
  from: number;
  to:   number;      // Infinity for last bracket
  flat: number;      // cumulative flat amount at `from`
  rate: number;      // marginal rate (decimal)
}

export interface StateDutyConfig {
  state:    AustralianState;
  brackets: DutyBracket[];
  /** First home buyer full concession threshold (new + established unless noted) */
  fhbFullConcession?: number;
  /** First home buyer partial concession upper threshold */
  fhbPartialMax?: number;
  /** New builds only — different threshold */
  fhbNewBuildFullConcession?: number;
  fhbNewBuildPartialMax?: number;
}

// ─── State configs ────────────────────────────────────────────────────────────

export const STAMP_DUTY_CONFIG: Record<AustralianState, StateDutyConfig> = {
  QLD: {
    state: "QLD",
    brackets: [
      { from: 0,         to: 5_000,       flat: 0,       rate: 0       },
      { from: 5_000,     to: 75_000,      flat: 0,       rate: 0.015   },
      { from: 75_000,    to: 540_000,     flat: 1_050,   rate: 0.035   },
      { from: 540_000,   to: 1_000_000,   flat: 17_325,  rate: 0.045   },
      { from: 1_000_000, to: Infinity,    flat: 38_025,  rate: 0.0575  },
    ],
    fhbFullConcession:        700_000,
    fhbPartialMax:            800_000,
    fhbNewBuildFullConcession: 750_000,
    fhbNewBuildPartialMax:    850_000,
  },
  NSW: {
    state: "NSW",
    brackets: [
      { from: 0,         to: 14_000,     flat: 0,       rate: 0.0125  },
      { from: 14_000,    to: 31_000,     flat: 175,     rate: 0.015   },
      { from: 31_000,    to: 83_000,     flat: 430,     rate: 0.0175  },
      { from: 83_000,    to: 310_000,    flat: 1_340,   rate: 0.035   },
      { from: 310_000,   to: 1_033_000,  flat: 9_285,   rate: 0.045   },
      { from: 1_033_000, to: 3_260_000,  flat: 41_820,  rate: 0.055   },
      { from: 3_260_000, to: Infinity,   flat: 164_285, rate: 0.07    },
    ],
    fhbFullConcession: 800_000,
    fhbPartialMax:     1_000_000,
  },
  VIC: {
    state: "VIC",
    brackets: [
      { from: 0,         to: 25_000,     flat: 0,       rate: 0.014   },
      { from: 25_000,    to: 130_000,    flat: 350,     rate: 0.024   },
      { from: 130_000,   to: 440_000,    flat: 2_870,   rate: 0.06    },
      { from: 440_000,   to: 550_000,    flat: 21_470,  rate: 0.06    },
      { from: 550_000,   to: 960_000,    flat: 27_810,  rate: 0.06    },
      { from: 960_000,   to: Infinity,   flat: 55_020,  rate: 0.065   },
    ],
    fhbFullConcession: 600_000,
    fhbPartialMax:     750_000,
  },
  WA: {
    state: "WA",
    brackets: [
      { from: 0,         to: 120_000,    flat: 0,       rate: 0.019   },
      { from: 120_000,   to: 150_000,    flat: 2_280,   rate: 0.0285  },
      { from: 150_000,   to: 360_000,    flat: 3_135,   rate: 0.038   },
      { from: 360_000,   to: 725_000,    flat: 11_115,  rate: 0.0475  },
      { from: 725_000,   to: Infinity,   flat: 28_453,  rate: 0.051   },
    ],
    fhbFullConcession: 430_000,
    fhbPartialMax:     530_000,
  },
  SA: {
    state: "SA",
    brackets: [
      { from: 0,         to: 12_000,     flat: 0,       rate: 0.01    },
      { from: 12_000,    to: 30_000,     flat: 120,     rate: 0.02    },
      { from: 30_000,    to: 50_000,     flat: 480,     rate: 0.03    },
      { from: 50_000,    to: 100_000,    flat: 1_080,   rate: 0.035   },
      { from: 100_000,   to: 200_000,    flat: 2_830,   rate: 0.04    },
      { from: 200_000,   to: 250_000,    flat: 6_830,   rate: 0.0425  },
      { from: 250_000,   to: 300_000,    flat: 8_955,   rate: 0.0450  },
      { from: 300_000,   to: 500_000,    flat: 11_205,  rate: 0.05    },
      { from: 500_000,   to: Infinity,   flat: 21_205,  rate: 0.055   },
    ],
    // SA has a $10k FHB grant for new builds, no broad stamp duty concession
    fhbFullConcession: 0,
    fhbPartialMax:     0,
  },
  TAS: {
    state: "TAS",
    brackets: [
      { from: 0,         to: 3_000,      flat: 0,       rate: 0       },
      { from: 3_000,     to: 25_000,     flat: 50,      rate: 0.0175  },
      { from: 25_000,    to: 75_000,     flat: 435,     rate: 0.025   },
      { from: 75_000,    to: 200_000,    flat: 1_685,   rate: 0.03    },
      { from: 200_000,   to: 375_000,    flat: 5_435,   rate: 0.035   },
      { from: 375_000,   to: 725_000,    flat: 11_560,  rate: 0.04    },
      { from: 725_000,   to: Infinity,   flat: 25_560,  rate: 0.045   },
    ],
    // TAS: 50% concession on duty for FHBs on homes under $600k
    fhbFullConcession: 0, // no full waiver — 50% reduction handled in calc
    fhbPartialMax:     600_000,
  },
  ACT: {
    state: "ACT",
    brackets: [
      { from: 0,         to: 260_000,    flat: 0,       rate: 0.0206  },
      { from: 260_000,   to: 300_000,    flat: 5_356,   rate: 0.0260  },
      { from: 300_000,   to: 500_000,    flat: 6_396,   rate: 0.0308  },
      { from: 500_000,   to: 750_000,    flat: 12_556,  rate: 0.0398  },
      { from: 750_000,   to: 1_000_000,  flat: 22_506,  rate: 0.0492  },
      { from: 1_000_000, to: 1_455_000,  flat: 34_806,  rate: 0.0553  },
      { from: 1_455_000, to: Infinity,   flat: 60_002,  rate: 0.0590  },
    ],
    fhbFullConcession: 0,   // ACT has concession scheme but it's means-tested
    fhbPartialMax:     0,
  },
  NT: {
    state: "NT",
    brackets: [
      { from: 0,         to: 525_000,    flat: 0,       rate: 0.0491  },
      { from: 525_000,   to: 3_000_000,  flat: 25_778,  rate: 0.0491  },
      { from: 3_000_000, to: 5_000_000,  flat: 147_278, rate: 0.0491  },
      { from: 5_000_000, to: Infinity,   flat: 245_778, rate: 0.0591  },
    ],
    // NT: up to $18,601 first-home buyer discount
    fhbFullConcession: 0,
    fhbPartialMax:     650_000,
  },
};

// ─── Calculation ──────────────────────────────────────────────────────────────

function applyBrackets(brackets: DutyBracket[], price: number): number {
  for (const b of [...brackets].reverse()) {
    if (price > b.from) {
      return b.flat + (price - b.from) * b.rate;
    }
  }
  return 0;
}

export function calculateStampDuty(
  state:       AustralianState,
  price:       number,
  isFirstHome: boolean,
  isNewBuild:  boolean,
): { base: number; concession: number; payable: number } {
  const cfg  = STAMP_DUTY_CONFIG[state];
  const base = applyBrackets(cfg.brackets, price);

  if (!isFirstHome) return { base, concession: 0, payable: base };

  // TAS: 50% concession
  if (state === "TAS" && price <= (cfg.fhbPartialMax ?? 0)) {
    const concession = base * 0.5;
    return { base, concession, payable: base - concession };
  }

  // NT: fixed discount capped at $18,601
  if (state === "NT" && price <= (cfg.fhbPartialMax ?? 0)) {
    const concession = Math.min(base, 18_601);
    return { base, concession, payable: base - concession };
  }

  // States with full then partial concession
  const fullThreshold = isNewBuild
    ? (cfg.fhbNewBuildFullConcession ?? cfg.fhbFullConcession ?? 0)
    : (cfg.fhbFullConcession ?? 0);
  const partialMax = isNewBuild
    ? (cfg.fhbNewBuildPartialMax ?? cfg.fhbPartialMax ?? 0)
    : (cfg.fhbPartialMax ?? 0);

  if (fullThreshold > 0 && price <= fullThreshold) {
    return { base, concession: base, payable: 0 };
  }

  if (partialMax > 0 && price <= partialMax) {
    // Linear taper from full concession at fullThreshold to 0 at partialMax
    const range      = partialMax - fullThreshold;
    const over       = price - fullThreshold;
    const fraction   = 1 - over / range;
    const concession = base * fraction;
    return { base, concession, payable: base - concession };
  }

  return { base, concession: 0, payable: base };
}

// Human-readable state name
export const STATE_LABELS: Record<AustralianState, string> = {
  NSW: "New South Wales", VIC: "Victoria",   QLD: "Queensland",
  WA:  "Western Australia", SA: "South Australia", TAS: "Tasmania",
  ACT: "ACT",              NT:  "Northern Territory",
};
