import type { QuizData } from "@/lib/types";
import { calculatePathA, calculatePathN, calculatePathC } from "@/lib/calculations";
import { calculateGrants } from "@/lib/grants";

export async function POST(request: Request) {
  let quiz: QuizData;
  try {
    quiz = await request.json() as QuizData;
  } catch {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (webhookUrl) {
    buildAndSend(quiz, webhookUrl).catch((err) => {
      console.error("[BorrowIQ] webhook send failed:", err);
    });
  }

  return Response.json({ ok: true });
}

async function buildAndSend(quiz: QuizData, webhookUrl: string) {
  const pathId = quiz.path ?? "first-home";
  const state  = quiz.state ?? quiz.targetState ?? "QLD";

  // ── Shared fields (sent by ALL paths) ─────────────────────────────────────
  const shared: Record<string, string | number> = {
    first_name:                   quiz.firstName          ?? "",
    last_name:                    quiz.lastName           ?? "",
    email:                        quiz.email              ?? "",
    phone:                        quiz.mobile             ?? "",
    source:                       "borrowiq",
    timestamp:                    new Date().toISOString(),
    borrowiq_income:              quiz.annualIncome        ?? 0,
    borrowiq_partner_income:      quiz.partnerIncome       ?? 0,
    borrowiq_credit_card_limit:   quiz.creditCardLimit     ?? 0,
    borrowiq_car_loan_monthly:    quiz.carLoanMonthly      ?? 0,
    borrowiq_personal_loan_monthly: quiz.personalLoanMonthly ?? 0,
    borrowiq_hecs_debt:           quiz.hecsDebt            ?? 0,
    borrowiq_dependants:          quiz.dependants           ?? 0,
  };

  // ── Path-specific payload ─────────────────────────────────────────────────
  let pathFields: Record<string, string | number>;

  if (pathId === "first-home") {
    const r = calculatePathA(quiz);
    const grants = calculateGrants(quiz, r.grossIncome);
    const eligible = grants
      .filter(g => g.status === "eligible")
      .map(g => g.shortName);

    pathFields = {
      path:                        "first_home_buyer",
      tags:                        ["BORROWIQ-LEAD", "FHB", r.qualified ? "QUALIFIED" : "NURTURE", state].join(","),
      borrowiq_qualified:          r.qualified ? "yes" : "no",
      borrowiq_buying_situation:   quiz.buyingSituation    ?? "",
      borrowiq_property_type:      quiz.propertyType        ?? "",
      borrowiq_state:              state,
      borrowiq_deposit:            quiz.deposit              ?? 0,
      borrowiq_borrowing_capacity: r.borrowingCapacity,
      borrowiq_max_property:       r.purchasePower,
      borrowiq_monthly_repayment:  r.monthlyRepayment,
      borrowiq_lvr:                r.lvr,
      borrowiq_grants_eligible:    eligible.length > 0 ? eligible.join(",") : "none",
    };

  } else if (pathId === "next-property") {
    const r = calculatePathN(quiz);

    pathFields = {
      path:                         "next_home",
      tags:                         ["BORROWIQ-LEAD", "NEXT-HOME", r.qualified ? "QUALIFIED" : "NURTURE", state].join(","),
      borrowiq_qualified:           r.qualified ? "yes" : "no",
      borrowiq_buying_situation:    quiz.buyingSituation      ?? "",
      borrowiq_state:               state,
      borrowiq_goal:                quiz.nextPropertyGoal     ?? "",
      borrowiq_num_properties:      quiz.portfolioCount        ?? 0,
      borrowiq_portfolio_worth:     quiz.totalPropertyValue    ?? 0,
      borrowiq_total_loan:          quiz.totalLoanBalance      ?? 0,
      borrowiq_rental_income:       quiz.monthlyRentalIncome   ?? 0,
      borrowiq_deposit:             quiz.cashSavings            ?? 0,
      borrowiq_equity:              r.usableEquity,
      borrowiq_additional_borrowing: r.additionalBorrowing,
      borrowiq_next_property_budget: r.maxBudget,
    };

  } else if (pathId === "review-loan") {
    const r = calculatePathC(quiz);

    pathFields = {
      path:                        "refinance",
      tags:                        ["BORROWIQ-LEAD", "REFINANCE", "QUALIFIED", state].join(","),
      borrowiq_qualified:          "yes",
      borrowiq_current_rate:       quiz.currentRate          ?? 0.065,
      borrowiq_total_loan:         quiz.currentLoanBalance   ?? 0,
      borrowiq_loan_type:          quiz.currentLoanType      ?? "",
      borrowiq_has_offset:         quiz.hasOffset ? "yes" : "no",
      borrowiq_offset_balance:     quiz.offsetBalance         ?? 0,
      borrowiq_deposit:            quiz.otherSavings           ?? 0,
      borrowiq_portfolio_worth:    quiz.propertyValue          ?? 0,
      borrowiq_annual_savings:     r.annualSavings,
    };

  } else {
    console.warn("[BorrowIQ] unknown path, skipping webhook:", pathId);
    return;
  }

  const payload = { ...shared, ...pathFields };

  console.log("[BorrowIQ] sending webhook payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("[BorrowIQ] webhook response:", res.status, res.statusText);
}
