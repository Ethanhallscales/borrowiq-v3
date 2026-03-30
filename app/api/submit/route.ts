import type { QuizData } from "@/lib/types";
import { calculatePathA, calculatePathB, calculatePathN, calculatePathC } from "@/lib/calculations";
import { BEST_AVAILABLE_RATE } from "@/lib/rates";

export async function POST(request: Request) {
  let quiz: QuizData;
  try {
    quiz = await request.json() as QuizData;
  } catch {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (webhookUrl) {
    // Fire and forget — do not await, do not block results page
    buildAndSend(quiz, webhookUrl).catch(() => {});
  }

  return Response.json({ ok: true });
}

async function buildAndSend(quiz: QuizData, webhookUrl: string) {
  const path = quiz.path ?? "first-home";
  const state = quiz.state ?? quiz.targetState ?? "QLD";
  const timestamp = new Date().toISOString();

  // ── Shared base payload ──────────────────────────────────────────────────────
  const base = {
    first_name:  quiz.firstName  ?? "",
    last_name:   quiz.lastName   ?? "",
    email:       quiz.email      ?? "",
    phone:       quiz.mobile     ?? "",
    source:      "borrowiq",
    timestamp,

    // User inputs
    buying_situation:        quiz.buyingSituation      ?? null,
    property_type:           quiz.propertyType         ?? null,
    state:                   state,
    gross_income:            quiz.annualIncome          ?? 0,
    partner_income:          quiz.partnerIncome         ?? 0,
    savings:                 quiz.deposit ?? quiz.cashSavings ?? 0,
    credit_card_limit:       quiz.creditCardLimit        ?? 0,
    car_loan_monthly:        quiz.carLoanMonthly         ?? 0,
    personal_loan_monthly:   quiz.personalLoanMonthly    ?? 0,
    hecs_debt:               quiz.hecsDebt              ?? 0,
    dependants:              quiz.dependants             ?? 0,
  };

  // ── Path-specific payload + qualification ────────────────────────────────────
  if (path === "first-home") {
    const r = calculatePathA(quiz);
    const tags = [
      "BORROWIQ-LEAD",
      "FHB",
      r.qualified ? "QUALIFIED" : "NURTURE",
      state,
    ];
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...base,
        path: "first_home_buyer",
        tags,
        // Calculated results
        borrowing_capacity: r.borrowingCapacity,
        max_purchase_price: r.purchasePower,
        monthly_repayment:  r.monthlyRepayment,
        lvr:                r.lvr,
      }),
    });

  } else if (path === "next-property") {
    const r = calculatePathN(quiz);
    const tags = [
      "BORROWIQ-LEAD",
      "NEXT-HOME",
      r.qualified ? "QUALIFIED" : "NURTURE",
      state,
    ];
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...base,
        path: "next_home",
        tags,
        // Path B specific inputs
        goal:                   quiz.nextPropertyGoal     ?? null,
        num_properties:         quiz.portfolioCount        ?? 0,
        total_property_value:   quiz.totalPropertyValue    ?? 0,
        total_loan_balance:     quiz.totalLoanBalance      ?? 0,
        rental_income_monthly:  quiz.monthlyRentalIncome   ?? 0,
        // Calculated results
        total_equity:           r.totalEquity,
        usable_equity:          r.usableEquity,
        affordable_equity_draw: r.affordableEquityDraw,
        additional_borrowing_power: r.additionalBorrowing,
        next_property_budget:   r.maxBudget,
        monthly_repayment:      r.existingMonthlyRepay,
        borrowing_capacity:     r.additionalBorrowing,
        max_purchase_price:     r.maxBudget,
        lvr:                    0, // dynamic per selected price
      }),
    });

  } else if (path === "review-loan") {
    const r = calculatePathC(quiz);
    const currentRate = quiz.currentRate ?? 0.065;
    const isQualified = currentRate > BEST_AVAILABLE_RATE;
    const tags = [
      "BORROWIQ-LEAD",
      "REFINANCE",
      "QUALIFIED", // Path C always qualifies
      state,
    ];
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...base,
        path: "refinance",
        tags,
        // Path C specific inputs
        current_loan_balance: quiz.currentLoanBalance ?? 0,
        current_rate:         currentRate,
        loan_type:            quiz.currentLoanType   ?? null,
        has_offset:           quiz.hasOffset          ?? false,
        offset_balance:       quiz.offsetBalance      ?? 0,
        savings_balance:      quiz.otherSavings        ?? 0,
        property_value:       quiz.propertyValue       ?? 0,
        // Calculated results
        annual_savings_potential: r.annualSavings,
        borrowing_capacity:       0,
        max_purchase_price:       0,
        monthly_repayment:        0,
        lvr:                      r.currentLvr,
        rate_above_best:          isQualified,
      }),
    });
  }
}
