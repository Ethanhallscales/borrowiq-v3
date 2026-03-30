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

  // ── Contact fields (GHL standard) ──────────────────────────────────────────
  const contact = {
    first_name: quiz.firstName ?? "",
    last_name:  quiz.lastName  ?? "",
    email:      quiz.email     ?? "",
    phone:      quiz.mobile    ?? "",
    source:     "borrowiq",
    timestamp,
  };

  // ── Shared custom fields (borrowiq_ prefix for GHL mapping) ────────────────
  const sharedCustom = {
    borrowiq_buying_situation: quiz.buyingSituation   ?? "",
    borrowiq_property_type:    quiz.propertyType       ?? "",
    borrowiq_state:            state,
    borrowiq_income:           quiz.annualIncome        ?? 0,
    borrowiq_savings:          quiz.deposit ?? quiz.cashSavings ?? 0,
    borrowiq_dependants:       quiz.dependants           ?? 0,
  };

  // ── Path-specific payload + qualification ──────────────────────────────────
  if (path === "first-home") {
    const r = calculatePathA(quiz);
    const tags = ["BORROWIQ-LEAD", "FHB", r.qualified ? "QUALIFIED" : "NURTURE", state];

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...contact,
        ...sharedCustom,
        tags:                         tags.join(","),
        borrowiq_path:                "first_home_buyer",
        borrowiq_borrowing_capacity:  r.borrowingCapacity,
        borrowiq_max_property:        r.purchasePower,
        borrowiq_monthly_repayment:   r.monthlyRepayment,
        borrowiq_lvr:                 r.lvr,
        borrowiq_qualified:           r.qualified ? "yes" : "no",
      }),
    });

  } else if (path === "next-property") {
    const r = calculatePathN(quiz);
    const tags = ["BORROWIQ-LEAD", "NEXT-HOME", r.qualified ? "QUALIFIED" : "NURTURE", state];

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...contact,
        ...sharedCustom,
        tags:                          tags.join(","),
        borrowiq_path:                 "next_home",
        borrowiq_qualified:            r.qualified ? "yes" : "no",
        borrowiq_goal:                 quiz.nextPropertyGoal      ?? "",
        borrowiq_num_properties:       quiz.portfolioCount         ?? 0,
        borrowiq_total_property_value: quiz.totalPropertyValue     ?? 0,
        borrowiq_total_loan_balance:   quiz.totalLoanBalance       ?? 0,
        borrowiq_rental_income:        quiz.monthlyRentalIncome    ?? 0,
        borrowiq_equity:               r.usableEquity,
        borrowiq_borrowing_capacity:   r.additionalBorrowing,
        borrowiq_next_property_budget: r.maxBudget,
        borrowiq_max_property:         r.maxBudget,
        borrowiq_monthly_repayment:    r.existingMonthlyRepay,
        borrowiq_lvr:                  0,
      }),
    });

  } else if (path === "review-loan") {
    const r = calculatePathC(quiz);
    const currentRate = quiz.currentRate ?? 0.065;
    const tags = ["BORROWIQ-LEAD", "REFINANCE", "QUALIFIED", state];

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...contact,
        ...sharedCustom,
        tags:                      tags.join(","),
        borrowiq_path:             "refinance",
        borrowiq_qualified:        "yes",
        borrowiq_current_loan:     quiz.currentLoanBalance ?? 0,
        borrowiq_current_rate:     currentRate,
        borrowiq_loan_type:        quiz.currentLoanType    ?? "",
        borrowiq_has_offset:       quiz.hasOffset           ?? false,
        borrowiq_offset_balance:   quiz.offsetBalance       ?? 0,
        borrowiq_savings_balance:  quiz.otherSavings         ?? 0,
        borrowiq_property_value:   quiz.propertyValue        ?? 0,
        borrowiq_annual_savings:   r.annualSavings,
        borrowiq_borrowing_capacity: 0,
        borrowiq_max_property:     0,
        borrowiq_monthly_repayment: 0,
        borrowiq_lvr:              r.currentLvr,
      }),
    });
  }
}
