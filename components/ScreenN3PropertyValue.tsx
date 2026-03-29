"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import OceanSlider from "@/components/ui/OceanSlider";

interface Props {
  step: number;
  totalSteps: number;
  onComplete: (value: number) => void;
  onBack: () => void;
}

const DEFAULT_VALUE = 600_000;

export default function ScreenN3PropertyValue({ step, totalSteps, onComplete, onBack }: Props) {
  const [value, setValue] = useState(DEFAULT_VALUE);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-6">
        <motion.h2
          className="mb-8 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.75rem,8vw,2.5rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          What's the total value of all your properties?
        </motion.h2>

        <div className="flex flex-1 flex-col justify-center">
          <OceanSlider
            value={value}
            min={200_000}
            max={5_000_000}
            step={25_000}
            onChange={setValue}
            onConfirm={() => onComplete(value)}
            label="Combined estimated property value"
            sublabel="Best estimate across all properties"
            format={v => "$" + v.toLocaleString("en-AU")}
            confirmLabel="Continue →"
          />
        </div>
      </div>
    </div>
  );
}
