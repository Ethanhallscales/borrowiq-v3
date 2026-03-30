"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";
import NumberPad from "@/components/ui/NumberPad";
import OceanSlider from "@/components/ui/OceanSlider";

export interface CommitmentsData {
  creditCardLimit:     number;
  carLoanMonthly:      number;
  personalLoanMonthly: number;
  hecsDebt:            number;
  dependants:          number;
}

interface Props {
  step: number; totalSteps: number;
  onComplete: (d: CommitmentsData) => void;
  onBack: () => void;
  lockedItems?: { label: string; amount: number }[];
}

type Section = "credit-card" | "car-loan" | "personal-loan" | "hecs" | "dependants";

interface NumberPadModal {
  section: "car-loan" | "personal-loan";
}

const DEP_OPTIONS = [
  { v: 0, label: "None" },
  { v: 1, label: "1" },
  { v: 2, label: "2" },
  { v: 3, label: "3" },
  { v: 4, label: "4+" },
];

export default function Screen7Commitments({ step, totalSteps, onComplete, onBack, lockedItems }: Props) {
  const [expanded, setExpanded] = useState<Section | null>(null);
  const [modal,    setModal]    = useState<NumberPadModal | null>(null);

  const [creditCard,    setCreditCard]    = useState(0);
  const [carLoan,       setCarLoan]       = useState(0);
  const [personalLoan,  setPersonalLoan]  = useState(0);
  const [hecsDebt,      setHecsDebt]      = useState(0);
  const [dependants,    setDependants]    = useState(0);
  const [padValue,      setPadValue]      = useState(0);

  function toggleSection(s: Section) {
    setExpanded(e => e === s ? null : s);
  }

  function openModal(s: "car-loan" | "personal-loan") {
    setPadValue(s === "car-loan" ? carLoan : personalLoan);
    setModal({ section: s });
  }

  function confirmModal() {
    if (!modal) return;
    if (modal.section === "car-loan")      setCarLoan(padValue);
    if (modal.section === "personal-loan") setPersonalLoan(padValue);
    setModal(null);
  }

  const SECTIONS: { id: Section; label: string; value: string; }[] = [
    { id: "credit-card",   label: "Credit card limit",      value: creditCard   > 0 ? `$${creditCard.toLocaleString()} limit`   : "$0" },
    { id: "car-loan",      label: "Car loan repayment",     value: carLoan      > 0 ? `$${carLoan.toLocaleString()}/mo`          : "$0" },
    { id: "personal-loan", label: "Personal loan",          value: personalLoan > 0 ? `$${personalLoan.toLocaleString()}/mo`     : "$0" },
    { id: "hecs",          label: "HECS / study debt",      value: hecsDebt     > 0 ? `$${hecsDebt.toLocaleString()} balance`    : "$0" },
    { id: "dependants",    label: "Dependants",             value: dependants   > 0 ? `${dependants === 4 ? "4+" : dependants}` : "0"  },
  ];

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: "#020B18" }}>
      <BlobBackground intensity={0.2} />
      <QuizHeader step={step} totalSteps={totalSteps} onBack={onBack} />

      {/* Number Pad Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col justify-end"
            style={{ background: "rgba(2,11,24,0.85)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-t-3xl px-5 pb-8 pt-6"
              style={{ background: "#041E3A", border: "1px solid rgba(10,61,107,0.7)" }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            >
              <NumberPad
                value={padValue} onChange={setPadValue}
                onConfirm={confirmModal}
                label={modal.section === "car-loan" ? "Monthly car loan repayment" : "Monthly personal loan repayment"}
                suffix="/month" maxDigits={5}
                confirmLabel="Save ✓"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-4 overflow-y-auto">
        <motion.h2
          className="mb-2 text-center"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: "clamp(1.6rem,7vw,2.2rem)", color: "#e6fbff", letterSpacing: "0.04em" }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        >
          Any existing financial commitments?
        </motion.h2>
        <p className="mb-5 text-center text-xs" style={{ color: "rgba(230,251,255,0.35)", fontFamily: "var(--font-dm-sans)" }}>
          Tap to expand — all default to $0. Be honest: lenders check everything.
        </p>

        {/* Locked items (Path B mortgage) */}
        {lockedItems?.map(item => (
          <div key={item.label} className="mb-2 flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "rgba(0,194,255,0.06)", border: "1px solid rgba(0,194,255,0.2)" }}>
            <div>
              <p style={{ color: "rgba(230,251,255,0.6)", fontFamily: "var(--font-dm-sans)", fontSize: "0.8rem" }}>{item.label}</p>
              <p style={{ fontFamily: "var(--font-bebas-neue)", color: "#00C2FF", fontSize: "1.1rem" }}>${item.amount.toLocaleString()}/mo</p>
            </div>
            <span style={{ color: "rgba(0,194,255,0.5)", fontSize: "0.65rem", fontFamily: "var(--font-dm-sans)" }}>Pre-filled</span>
          </div>
        ))}

        {/* Accordion sections */}
        <div className="flex flex-col gap-2">
          {SECTIONS.map(s => (
            <div key={s.id}>
              <motion.button type="button" onClick={() => toggleSection(s.id)}
                className="w-full overflow-hidden rounded-2xl outline-none" whileTap={{ scale: 0.98 }}>
                <div className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: expanded === s.id ? "rgba(0,194,255,0.08)" : "rgba(4,30,58,0.62)",
                    border: `1px solid ${expanded === s.id ? "rgba(0,194,255,0.4)" : "rgba(10,61,107,0.65)"}`,
                    backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: "1rem",
                  }}>
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "0.875rem", color: "rgba(230,251,255,0.8)" }}>{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "var(--font-bebas-neue)", color: "#00C2FF", fontSize: "1.1rem" }}>{s.value}</span>
                    <motion.span
                      animate={{ rotate: expanded === s.id ? 180 : 0 }}
                      style={{ color: "rgba(230,251,255,0.3)", fontFamily: "var(--font-dm-sans)" }}>▾</motion.span>
                  </div>
                </div>
              </motion.button>

              <AnimatePresence>
                {expanded === s.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 py-3">
                      {s.id === "credit-card" && (
                        <OceanSlider value={creditCard} min={0} max={50_000} step={1_000}
                          onChange={setCreditCard} label="Total credit card limit"
                          format={v => "$" + v.toLocaleString("en-AU")}
                          liveCalc={v => v > 0 ? <p style={{ color: "#FFB800", fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", textAlign: "center" }}>Reduces borrowing by ~${(v * 0.038 / 12 * 12 * 5).toLocaleString("en-AU")} over 5 yrs</p> : null}
                        />
                      )}
                      {(s.id === "car-loan" || s.id === "personal-loan") && (
                        <button type="button" onClick={() => openModal(s.id as "car-loan" | "personal-loan")}
                          className="w-full rounded-xl py-3 text-center"
                          style={{ background: "rgba(4,30,58,0.8)", border: "1px solid rgba(10,61,107,0.7)", color: "#00C2FF", fontFamily: "var(--font-dm-sans)", fontSize: "0.9rem" }}>
                          {s.id === "car-loan" ? (carLoan > 0 ? `$${carLoan.toLocaleString()}/mo — tap to edit` : "Tap to enter monthly amount") : (personalLoan > 0 ? `$${personalLoan.toLocaleString()}/mo — tap to edit` : "Tap to enter monthly amount")}
                        </button>
                      )}
                      {s.id === "hecs" && (
                        <OceanSlider value={hecsDebt} min={0} max={100_000} step={1_000}
                          onChange={setHecsDebt} label="HECS / HELP balance"
                          format={v => "$" + v.toLocaleString("en-AU")}
                          liveCalc={v => v > 0 ? <p style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)", fontSize: "0.75rem", textAlign: "center" }}>Approx. repayment deducted from assessable income</p> : null}
                        />
                      )}
                      {s.id === "dependants" && (
                        <div className="flex gap-2">
                          {DEP_OPTIONS.map(o => (
                            <button key={o.v} type="button" onClick={() => setDependants(o.v)}
                              className="flex-1 rounded-xl py-3 text-center"
                              style={{
                                background: dependants === o.v ? "rgba(0,194,255,0.12)" : "rgba(4,30,58,0.7)",
                                border: `1px solid ${dependants === o.v ? "#00C2FF" : "rgba(10,61,107,0.7)"}`,
                                color: dependants === o.v ? "#00C2FF" : "#e6fbff",
                                fontFamily: "var(--font-bebas-neue)", fontSize: "1.2rem",
                              }}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Continue */}
        <motion.button
          type="button"
          onClick={() => onComplete({ creditCardLimit: creditCard, carLoanMonthly: carLoan, personalLoanMonthly: personalLoan, hecsDebt, dependants })}
          className="mt-6 w-full rounded-2xl py-4 text-base font-semibold"
          style={{ background: "linear-gradient(135deg,#0076BE,#00C2FF)", color: "#020B18", fontFamily: "var(--font-dm-sans)", boxShadow: "0 0 32px -8px rgba(0,194,255,0.6)" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
        >
          Calculate My Borrowing Power →
        </motion.button>
      </div>
    </div>
  );
}
