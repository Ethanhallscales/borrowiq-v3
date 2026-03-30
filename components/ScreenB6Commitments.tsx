"use client";

import Screen7Commitments from "@/components/Screen7Commitments";
import type { CommitmentsData } from "@/components/Screen7Commitments";

export type { CommitmentsData };

interface Props {
  step: number; totalSteps: number;
  currentMonthlyRepayment: number;
  onComplete: (d: CommitmentsData) => void;
  onBack: () => void;
}

export default function ScreenB6Commitments({
  step, totalSteps, currentMonthlyRepayment, onComplete, onBack,
}: Props) {
  return (
    <Screen7Commitments
      step={step}
      totalSteps={totalSteps}
      onComplete={onComplete}
      onBack={onBack}
      lockedItems={
        currentMonthlyRepayment > 0
          ? [{ label: "Current mortgage repayment", amount: currentMonthlyRepayment }]
          : undefined
      }
    />
  );
}
