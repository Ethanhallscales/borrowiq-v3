"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BlobBackground } from "@/components/ui/MorphingBlob";
import QuizHeader from "@/components/ui/QuizHeader";

export interface ContactData {
  firstName: string;
  lastName:  string;
  mobile:    string;
  email:     string;
}

interface Props {
  heading:    string;
  subheading?: string;
  onSubmit:   (d: ContactData) => void;
  onBack:     () => void;
}

const INPUT_BASE: React.CSSProperties = {
  background:    "rgba(4,30,58,0.70)",
  border:        "1px solid rgba(10,61,107,0.7)",
  borderRadius:  "0.875rem",
  color:         "#e6fbff",
  fontFamily:    "var(--font-dm-sans)",
  fontSize:      "1rem",
  padding:       "14px 16px",
  width:         "100%",
  outline:       "none",
  WebkitAppearance: "none",
};
const INPUT_FOCUS: React.CSSProperties = {
  ...INPUT_BASE,
  border: "1.5px solid #00C2FF",
  boxShadow: "0 0 0 3px rgba(0,194,255,0.12)",
};

function OceanInput({
  label, placeholder, value, onChange, type = "text",
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label
        className="mb-1.5 block text-xs uppercase tracking-wider"
        style={{ color: "rgba(230,251,255,0.35)", fontFamily: "var(--font-dm-sans)" }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={focused ? INPUT_FOCUS : INPUT_BASE}
        autoComplete="off"
        autoCapitalize={type === "email" ? "none" : "words"}
      />
    </div>
  );
}

export default function ContactCapture({ heading, subheading, onSubmit, onBack }: Props) {
  const [form, setForm] = useState<ContactData>({
    firstName: "", lastName: "", mobile: "", email: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const isValid = form.firstName && form.lastName && form.mobile.length >= 8 && form.email.includes("@");

  function set(key: keyof ContactData) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
  }

  function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    onSubmit(form);
  }

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: "#020B18" }}
    >
      <BlobBackground intensity={0.1} />
      <QuizHeader step={0} totalSteps={0} onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-4 overflow-y-auto">
        {/* Heading */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="mb-2 inline-block rounded-full px-3 py-1 text-xs uppercase tracking-widest"
            style={{ background: "rgba(0,194,255,0.1)", color: "#00C2FF", fontFamily: "var(--font-dm-sans)", border: "1px solid rgba(0,194,255,0.3)" }}
          >
            Your free report is ready
          </div>
          <h2
            className="mt-3 leading-tight"
            style={{
              fontFamily: "var(--font-bebas-neue)",
              fontSize: "clamp(1.8rem,8vw,2.6rem)",
              color: "#e6fbff",
              letterSpacing: "0.04em",
            }}
          >
            {heading}
          </h2>
          {subheading && (
            <p className="mt-2 text-sm" style={{ color: "rgba(230,251,255,0.4)", fontFamily: "var(--font-dm-sans)" }}>
              {subheading}
            </p>
          )}
        </motion.div>

        {/* Form */}
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="grid grid-cols-2 gap-3">
            <OceanInput label="First name" placeholder="Jane" value={form.firstName} onChange={set("firstName")} />
            <OceanInput label="Last name"  placeholder="Smith" value={form.lastName}  onChange={set("lastName")} />
          </div>
          <OceanInput label="Mobile" placeholder="+61 4XX XXX XXX" value={form.mobile}
            onChange={set("mobile")} type="tel" />
          <OceanInput label="Email" placeholder="jane@email.com" value={form.email}
            onChange={set("email")} type="email" />
        </motion.div>

        {/* Submit */}
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="mt-6 w-full rounded-2xl py-4 text-base font-semibold transition-opacity"
          style={{
            background: isValid ? "linear-gradient(135deg,#0076BE,#00C2FF)" : "rgba(10,61,107,0.5)",
            color:  isValid ? "#020B18" : "rgba(230,251,255,0.3)",
            fontFamily: "var(--font-dm-sans)",
            boxShadow: isValid ? "0 0 32px -8px rgba(0,194,255,0.6)" : "none",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={isValid ? { scale: 0.97 } : {}}
        >
          {submitting ? "Opening your report…" : "Send My Results →"}
        </motion.button>

        {/* Privacy */}
        <p
          className="mt-4 text-center text-xs leading-relaxed"
          style={{ color: "rgba(230,251,255,0.2)", fontFamily: "var(--font-dm-sans)" }}
        >
          Your details are kept private and never sold.
          By submitting you agree to be contacted by Assist Loans.
        </p>
      </div>
    </div>
  );
}
