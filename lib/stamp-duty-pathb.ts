/**
 * Path B stamp duty rates — stored separately for future admin editing.
 * QLD rates used as default (Path N has no state selector).
 *
 * These are progressive/marginal brackets:
 *   First $350k at 1%, $350k-$540k at 3.5%, $540k-$1M at 4.5%, $1M+ at 5.75%.
 */

export interface PathBDutyBracket {
  from: number;
  to:   number;      // Infinity for last bracket
  rate: number;      // marginal rate (decimal)
}

// ─── QLD brackets (owner-occupier & investor — same in QLD) ──────────────────

export const QLD_PATHB_BRACKETS: PathBDutyBracket[] = [
  { from: 0,         to: 350_000,   rate: 0.01   },
  { from: 350_000,   to: 540_000,   rate: 0.035  },
  { from: 540_000,   to: 1_000_000, rate: 0.045  },
  { from: 1_000_000, to: Infinity,  rate: 0.0575 },
];

// ─── Calculator ──────────────────────────────────────────────────────────────

export function calculateStampDutyPathB(
  price: number,
  brackets: PathBDutyBracket[] = QLD_PATHB_BRACKETS,
): number {
  let duty = 0;
  for (const b of brackets) {
    if (price <= b.from) break;
    const taxable = Math.min(price, b.to) - b.from;
    duty += taxable * b.rate;
  }
  return Math.round(duty);
}
