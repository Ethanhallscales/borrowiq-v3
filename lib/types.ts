// ─── Path / Flow ──────────────────────────────────────────────────────────────

export type PathId = "first-home" | "next-property" | "review-loan";
export type Flow   = "A" | "B" | "C";

export type NextPropertyGoal = "live-in" | "investment";

// ─── Screen IDs ───────────────────────────────────────────────────────────────

type S0 = "s0";

type FlowAScreen =
  | "A1" | "A2" | "A3" | "A5" | "A6" | "A7"
  | "A_proc" | "A_contact" | "A_results";

type FlowBScreen =
  | "B1" | "B2" | "B3" | "B4" | "B5" | "B6"
  | "B_proc" | "B_contact" | "B_results";

type FlowCScreen =
  | "C1" | "C2" | "C3" | "C4"
  | "C_proc" | "C_contact" | "C_results";

type FlowNScreen =
  | "N1" | "N2" | "N3" | "N4" | "N5" | "N5b"
  | "N6" | "N6c" | "N7"
  | "N_proc" | "N_contact" | "N_results";

export type ScreenId = S0 | FlowAScreen | FlowBScreen | FlowCScreen | FlowNScreen;

// ─── Flow step metadata ───────────────────────────────────────────────────────

export const FLOW_A_STEPS: FlowAScreen[] = ["A1","A2","A3","A5","A6","A7"];
export const FLOW_B_STEPS: FlowBScreen[] = ["B1","B2","B3","B4","B5","B6"];
export const FLOW_C_STEPS: FlowCScreen[] = ["C1","C2","C3","C4"];
export const FLOW_N_STEPS: FlowNScreen[] = ["N1","N2","N3","N4","N5","N5b","N6","N6c","N7"];

export function getStepInfo(screen: ScreenId): { step: number; total: number } | null {
  const ai = FLOW_A_STEPS.indexOf(screen as FlowAScreen);
  if (ai >= 0) return { step: ai + 1, total: FLOW_A_STEPS.length };
  const bi = FLOW_B_STEPS.indexOf(screen as FlowBScreen);
  if (bi >= 0) return { step: bi + 1, total: FLOW_B_STEPS.length };
  const ci = FLOW_C_STEPS.indexOf(screen as FlowCScreen);
  if (ci >= 0) return { step: ci + 1, total: FLOW_C_STEPS.length };
  const ni = FLOW_N_STEPS.indexOf(screen as FlowNScreen);
  if (ni >= 0) return { step: ni + 1, total: FLOW_N_STEPS.length };
  return null;
}

export function getFlow(screen: ScreenId): Flow | null {
  if (screen.startsWith("A")) return "A";
  if (screen.startsWith("B")) return "B";
  if (screen.startsWith("C")) return "C";
  if (screen.startsWith("N")) return "B"; // Flow N is the new Path B
  return null;
}

// ─── Answer types ─────────────────────────────────────────────────────────────

export type BuyingSituation  = "solo" | "partner" | "single-parent";
export type PropertyType     = "house" | "apartment" | "townhouse" | "land";
export type AustralianState  = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
export type LoanType         = "variable" | "fixed" | "split";
export type PropertyGoal     = "upgrading" | "downsizing" | "investment" | "holiday";
export type CurrentPropPlan  = "selling" | "keeping" | "undecided";

// ─── Quiz state ───────────────────────────────────────────────────────────────

export interface QuizData {
  path?: PathId;

  // ── Shared / Flow A ───────────────────────────────────────────────────────
  buyingSituation?:  BuyingSituation;
  propertyType?:     PropertyType;
  state?:            AustralianState;
  annualIncome?:     number;
  partnerIncome?:    number;
  deposit?:          number;
  creditCardLimit?:  number;
  carLoanMonthly?:   number;
  personalLoanMonthly?: number;
  hecsDebt?:         number;
  dependants?:       number;

  // ── Flow B ────────────────────────────────────────────────────────────────
  propertyGoal?:           PropertyGoal;
  currentPropertyValue?:   number;
  currentLoanBalance?:     number;
  currentRate?:            number;        // decimal e.g. 0.062
  currentLoanType?:        LoanType;
  currentMonthlyRepayment?: number;
  investmentProperties?:   number;
  monthlyRentalIncome?:    number;
  targetPropertyPrice?:    number;
  targetState?:            AustralianState;
  targetPropertyType?:     PropertyType;
  currentPropertyPlan?:    CurrentPropPlan;

  // ── Flow N ────────────────────────────────────────────────────────────────
  nextPropertyGoal?:    NextPropertyGoal;
  portfolioCount?:      number;
  totalPropertyValue?:  number;
  totalLoanBalance?:    number;
  hasRentalIncome?:     boolean;
  cashSavings?:         number;

  // ── Flow C ────────────────────────────────────────────────────────────────
  // reuses: currentLoanBalance, currentRate, currentLoanType (from B)
  hasOffset?:     boolean;
  offsetBalance?: number;
  otherSavings?:  number;
  propertyValue?: number;

  // ── Contact ───────────────────────────────────────────────────────────────
  firstName?: string;
  lastName?:  string;
  mobile?:    string;
  email?:     string;
}
