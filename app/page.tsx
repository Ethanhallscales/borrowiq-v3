"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type {
  ScreenId, QuizData,
  BuyingSituation, PropertyType, AustralianState, EmploymentType,
  LoanType, PropertyGoal, CurrentPropPlan, NextPropertyGoal,
} from "@/lib/types";
import { getStepInfo } from "@/lib/types";
import { calculatePathA, calculatePathB, calculatePathC, formatCurrency, pmtN, MARKET_RATE as MKT } from "@/lib/calculations";

// ── Flow A ────────────────────────────────────────────────────────────────────
import Screen0EntryFork        from "@/components/Screen0EntryFork";
import Screen1BuyingSituation  from "@/components/Screen1BuyingSituation";
import Screen2PropertyType     from "@/components/Screen2PropertyType";
import Screen3State            from "@/components/Screen3State";
import Screen4EmploymentType   from "@/components/Screen4EmploymentType";
import Screen5Income           from "@/components/Screen5Income";
import type { IncomeData }     from "@/components/Screen5Income";
import Screen6Deposit          from "@/components/Screen6Deposit";
import Screen7Commitments      from "@/components/Screen7Commitments";
import type { CommitmentsData } from "@/components/Screen7Commitments";
import Screen10ResultsA        from "@/components/Screen10ResultsA";

// ── Flow B ────────────────────────────────────────────────────────────────────
import ScreenB1Goal            from "@/components/ScreenB1Goal";
import ScreenB2CurrentProperty from "@/components/ScreenB2CurrentProperty";
import ScreenB3CurrentLoan     from "@/components/ScreenB3CurrentLoan";
import ScreenB5TargetProperty  from "@/components/ScreenB5TargetProperty";
import ScreenB6Commitments     from "@/components/ScreenB6Commitments";
import ScreenB8ResultsB        from "@/components/ScreenB8ResultsB";

// ── Flow N ────────────────────────────────────────────────────────────────────
import ScreenN1Goal          from "@/components/ScreenN1Goal";
import ScreenN2Portfolio     from "@/components/ScreenN2Portfolio";
import ScreenN3PropertyValue from "@/components/ScreenN3PropertyValue";
import ScreenN4LoanBalance   from "@/components/ScreenN4LoanBalance";
import ScreenN5RentalIncome  from "@/components/ScreenN5RentalIncome";
import ScreenN5bSavings      from "@/components/ScreenN5bSavings";
import ScreenN9ResultsB      from "@/components/ScreenN9ResultsB";

// ── Flow C ────────────────────────────────────────────────────────────────────
import ScreenC1CurrentLoan     from "@/components/ScreenC1CurrentLoan";
import ScreenC2Offset          from "@/components/ScreenC2Offset";
import ScreenC3Savings         from "@/components/ScreenC3Savings";
import ScreenC4PropertyValue   from "@/components/ScreenC4PropertyValue";
import ScreenC7ResultsC        from "@/components/ScreenC7ResultsC";

// ── Shared UI ─────────────────────────────────────────────────────────────────
import ProcessingScreen from "@/components/ui/ProcessingScreen";
import ContactCapture   from "@/components/ui/ContactCapture";
import type { ContactData } from "@/components/ui/ContactCapture";

// ─── Slide transition ─────────────────────────────────────────────────────────

const variants = {
  enter:  (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center:              () => ({ x: 0,                          opacity: 1 }),
  exit:   (dir: number) => ({ x: dir > 0 ? "-20%"  : "100%", opacity: 0 }),
};
const transition = { duration: 0.3, ease: [0.32, 0, 0.67, 0] as const };

// ─── Helper: cast any partial data record to QuizData for advance() ──────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asQuiz(d: Record<string, any>): Partial<QuizData> { return d as Partial<QuizData>; }

// ─── Path → first screen ──────────────────────────────────────────────────────

const PATH_FIRST: Record<string, ScreenId> = {
  "first-home":    "A1",
  "next-property": "N1",
  "review-loan":   "C1",
};

// ─── Processing messages ──────────────────────────────────────────────────────

const PROC_A = [
  "Analysing your income...",
  "Calculating borrowing capacity...",
  "Checking stamp duty & grants...",
  "Stress-testing at APRA buffer...",
  "Building your report...",
];

const PROC_B = [
  "Calculating your equity...",
  "Assessing additional borrowing capacity...",
  "Modelling your property scenarios...",
  "Building your move plan...",
];

const PROC_C = [
  "Reviewing your current rate...",
  "Calculating offset savings...",
  "Comparing market rates...",
  "Building your savings report...",
];

const PROC_N = [
  "Assessing your equity position...",
  "Calculating additional borrowing power...",
  "Checking serviceability across your portfolio...",
  "Comparing 30+ lenders...",
  "Report ready.",
];

// ─── Slide wrapper — defined outside Home so it has a stable identity ─────────
// If Slide were defined inside Home, every parent re-render (e.g. on setQuiz)
// would produce a new component type reference, causing React to unmount and
// remount children and reset their local state.

function Slide({ id, direction, children }: { id: string; direction: number; children: React.ReactNode }) {
  return (
    <motion.div
      key={id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="absolute inset-0"
    >
      {children}
    </motion.div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function Home() {
  const [history,   setHistory]   = useState<ScreenId[]>(["s0"]);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [quiz,      setQuiz]      = useState<QuizData>({});

  const screen  = history[history.length - 1];
  const stepInfo = getStepInfo(screen);

  function advance(next: ScreenId, data?: Partial<QuizData>) {
    if (data) setQuiz((q) => ({ ...q, ...data }));
    setDirection(1);
    setHistory((h) => [...h, next]);
  }

  function back() {
    if (history.length <= 1) return;
    setDirection(-1);
    setHistory((h) => h.slice(0, -1));
  }

  // Blurred preview values for processing screens
  const blurA = useMemo(() => formatCurrency(calculatePathA(quiz).purchasePower), [quiz]);
  const blurB = useMemo(() => formatCurrency(calculatePathB(quiz).totalBudget),   [quiz]);
  const blurC = useMemo(
    () => formatCurrency(calculatePathC(quiz).annualSavings) + "/yr",
    [quiz]
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: "#020B18" }}>
      <AnimatePresence mode="wait" custom={direction}>

        {/* ── Screen 0 — Entry fork ─────────────────────────────────────────── */}
        {screen === "s0" && (
          <Slide id="s0" direction={direction}>
            <Screen0EntryFork
              onComplete={(path) => advance(PATH_FIRST[path], { path })}
            />
          </Slide>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            FLOW A — First home buyer
        ════════════════════════════════════════════════════════════════════ */}

        {screen === "A1" && (
          <Slide id="A1" direction={direction}>
            <Screen1BuyingSituation
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(situation: BuyingSituation) =>
                advance("A2", { buyingSituation: situation })
              }
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A2" && (
          <Slide id="A2" direction={direction}>
            <Screen2PropertyType
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(t: PropertyType) => advance("A3", { propertyType: t })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A3" && (
          <Slide id="A3" direction={direction}>
            <Screen3State
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              defaultState={quiz.state}
              onComplete={(s: AustralianState) => advance("A4", { state: s })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A4" && (
          <Slide id="A4" direction={direction}>
            <Screen4EmploymentType
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(t: EmploymentType) => advance("A5", { employmentType: t })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A5" && (
          <Slide id="A5" direction={direction}>
            <Screen5Income
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              quiz={quiz}
              onComplete={(d: IncomeData) => advance("A6", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A6" && (
          <Slide id="A6" direction={direction}>
            <Screen6Deposit
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(deposit: number) => advance("A7", { deposit })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A7" && (
          <Slide id="A7" direction={direction}>
            <Screen7Commitments
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(d: CommitmentsData) => advance("A_proc", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A_proc" && (
          <Slide id="A_proc" direction={direction}>
            <ProcessingScreen
              messages={PROC_A}
              onComplete={() => advance("A_contact")}
            />
          </Slide>
        )}

        {screen === "A_contact" && (
          <Slide id="A_contact" direction={direction}>
            <ContactCapture
              heading="Unlock Your Free Report"
              subheading="Your personalised borrowing breakdown is ready."
              onSubmit={(d: ContactData) => advance("A_results", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "A_results" && (
          <Slide id="A_results" direction={direction}>
            <Screen10ResultsA quiz={quiz} />
          </Slide>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            FLOW B — Buy another property
        ════════════════════════════════════════════════════════════════════ */}

        {screen === "B1" && (
          <Slide id="B1" direction={direction}>
            <ScreenB1Goal
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(g: PropertyGoal) => advance("B2", { propertyGoal: g })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "B2" && (
          <Slide id="B2" direction={direction}>
            <ScreenB2CurrentProperty
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(value: number, balance: number) =>
                advance("B3", { currentPropertyValue: value, currentLoanBalance: balance })
              }
              onBack={back}
            />
          </Slide>
        )}

        {screen === "B3" && (
          <Slide id="B3" direction={direction}>
            <ScreenB3CurrentLoan
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(rate: number, type: LoanType, repayment: number) =>
                advance("B4", {
                  currentRate: rate,
                  currentLoanType: type,
                  currentMonthlyRepayment: repayment,
                })
              }
              onBack={back}
            />
          </Slide>
        )}

        {screen === "B4" && (
          <Slide id="B4" direction={direction}>
            <Screen5Income
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              quiz={quiz}
              showInvestmentExtra
              onComplete={(d: IncomeData) => advance("B5", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "B5" && (
          <Slide id="B5" direction={direction}>
            <ScreenB5TargetProperty
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(
                price: number,
                state: AustralianState,
                propType: PropertyType,
                plan: CurrentPropPlan
              ) =>
                advance("B6", {
                  targetPropertyPrice: price,
                  targetState: state,
                  targetPropertyType: propType,
                  currentPropertyPlan: plan,
                })
              }
              onBack={back}
            />
          </Slide>
        )}

        {screen === "B6" && (
          <Slide id="B6" direction={direction}>
            <ScreenB6Commitments
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              currentMonthlyRepayment={quiz.currentMonthlyRepayment ?? 0}
              onComplete={(d: CommitmentsData) => advance("B_proc", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "B_proc" && (
          <Slide id="B_proc" direction={direction}>
            <ProcessingScreen
              messages={PROC_B}
              blurredValue={blurB}
              onComplete={() => advance("B_contact")}
            />
          </Slide>
        )}

        {screen === "B_contact" && (
          <Slide id="B_contact" direction={direction}>
            <ContactCapture
              heading="Your Property Plan Is Ready"
              subheading="Enter your details to unlock the full breakdown."
              onSubmit={(d: ContactData) => advance("B_results", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "B_results" && (
          <Slide id="B_results" direction={direction}>
            <ScreenB8ResultsB quiz={quiz} />
          </Slide>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            FLOW C — Review current loan
        ════════════════════════════════════════════════════════════════════ */}

        {screen === "C1" && (
          <Slide id="C1" direction={direction}>
            <ScreenC1CurrentLoan
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              onComplete={(balance: number, rate: number, type: LoanType) =>
                advance("C2", {
                  currentLoanBalance: balance,
                  currentRate: rate,
                  currentLoanType: type,
                })
              }
              onBack={back}
            />
          </Slide>
        )}

        {screen === "C2" && (
          <Slide id="C2" direction={direction}>
            <ScreenC2Offset
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              currentRate={quiz.currentRate ?? 0.065}
              onComplete={(hasOffset: boolean, balance: number) =>
                advance("C3", { hasOffset, offsetBalance: balance })
              }
              onBack={back}
            />
          </Slide>
        )}

        {screen === "C3" && (
          <Slide id="C3" direction={direction}>
            <ScreenC3Savings
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              currentRate={quiz.currentRate ?? 0.065}
              onComplete={(savings: number) => advance("C4", { otherSavings: savings })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "C4" && (
          <Slide id="C4" direction={direction}>
            <ScreenC4PropertyValue
              step={stepInfo!.step} totalSteps={stepInfo!.total}
              loanBalance={quiz.currentLoanBalance ?? 0}
              onComplete={(value: number) => advance("C_proc", { propertyValue: value })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "C_proc" && (
          <Slide id="C_proc" direction={direction}>
            <ProcessingScreen
              messages={PROC_C}
              blurredValue={blurC}
              onComplete={() => advance("C_contact")}
            />
          </Slide>
        )}

        {screen === "C_contact" && (
          <Slide id="C_contact" direction={direction}>
            <ContactCapture
              heading="Your Savings Report Is Ready"
              subheading="See exactly how much you could save — for free."
              onSubmit={(d: ContactData) => advance("C_results", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "C_results" && (
          <Slide id="C_results" direction={direction}>
            <ScreenC7ResultsC quiz={quiz} />
          </Slide>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            FLOW N — Next Home Buyer
        ════════════════════════════════════════════════════════════════════ */}

        {screen === "N1" && (
          <Slide id="N1" direction={direction}>
            <ScreenN1Goal
              step={getStepInfo("N1")!.step} totalSteps={getStepInfo("N1")!.total}
              onComplete={(g: NextPropertyGoal) => advance("N2", { nextPropertyGoal: g })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N2" && (
          <Slide id="N2" direction={direction}>
            <ScreenN2Portfolio
              step={getStepInfo("N2")!.step} totalSteps={getStepInfo("N2")!.total}
              onComplete={(count: number) => advance("N3", { portfolioCount: count })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N3" && (
          <Slide id="N3" direction={direction}>
            <ScreenN3PropertyValue
              step={getStepInfo("N3")!.step} totalSteps={getStepInfo("N3")!.total}
              onComplete={(value: number) => advance("N4", { totalPropertyValue: value })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N4" && (
          <Slide id="N4" direction={direction}>
            <ScreenN4LoanBalance
              step={getStepInfo("N4")!.step} totalSteps={getStepInfo("N4")!.total}
              totalPropertyValue={quiz.totalPropertyValue ?? 0}
              onComplete={(balance: number) => advance("N5", { totalLoanBalance: balance })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N5" && (
          <Slide id="N5" direction={direction}>
            <ScreenN5RentalIncome
              step={getStepInfo("N5")!.step} totalSteps={getStepInfo("N5")!.total}
              onComplete={(hasRental: boolean, monthlyAmount: number) =>
                advance("N5b", { hasRentalIncome: hasRental, monthlyRentalIncome: monthlyAmount })
              }
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N5b" && (
          <Slide id="N5b" direction={direction}>
            <ScreenN5bSavings
              step={getStepInfo("N5b")!.step} totalSteps={getStepInfo("N5b")!.total}
              onComplete={(savings: number) => advance("N6", { cashSavings: savings })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N6" && (
          <Slide id="N6" direction={direction}>
            <Screen1BuyingSituation
              step={getStepInfo("N6")!.step} totalSteps={getStepInfo("N6")!.total}
              onComplete={(situation: BuyingSituation) => advance("N6b", { buyingSituation: situation })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N6b" && (
          <Slide id="N6b" direction={direction}>
            <Screen4EmploymentType
              step={getStepInfo("N6b")!.step} totalSteps={getStepInfo("N6b")!.total}
              onComplete={(t: EmploymentType) => advance("N6c", { employmentType: t })}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N6c" && (
          <Slide id="N6c" direction={direction}>
            <Screen5Income
              step={getStepInfo("N6c")!.step} totalSteps={getStepInfo("N6c")!.total}
              quiz={quiz}
              onComplete={(d: IncomeData) => advance("N7", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N7" && (
          <Slide id="N7" direction={direction}>
            <Screen7Commitments
              step={getStepInfo("N7")!.step} totalSteps={getStepInfo("N7")!.total}
              lockedItems={quiz.totalLoanBalance && quiz.totalLoanBalance > 0
                ? [{ label: "Existing mortgage repayments (estimated)", amount: Math.round(pmtN(MKT, quiz.totalLoanBalance, 25 * 12)) }]
                : []}
              onComplete={(d: CommitmentsData) => advance("N_proc", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N_proc" && (
          <Slide id="N_proc" direction={direction}>
            <ProcessingScreen
              messages={PROC_N}
              onComplete={() => advance("N_contact")}
            />
          </Slide>
        )}

        {screen === "N_contact" && (
          <Slide id="N_contact" direction={direction}>
            <ContactCapture
              heading="Unlock Your Property Report"
              subheading="Your personalised next property breakdown is ready."
              onSubmit={(d: ContactData) => advance("N_results", asQuiz(d))}
              onBack={back}
            />
          </Slide>
        )}

        {screen === "N_results" && (
          <Slide id="N_results" direction={direction}>
            <ScreenN9ResultsB quiz={quiz} />
          </Slide>
        )}

      </AnimatePresence>
    </div>
  );
}
