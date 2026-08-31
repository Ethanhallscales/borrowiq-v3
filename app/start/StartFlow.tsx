"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { runCalc, type Mode } from "@/lib/start/startCalc";
import { STATE_NAMES, type LocationRow, type ResolvedLocation, type CapRegion } from "@/lib/start/locationCaps";
import { buildStartPayload, submitStart } from "./submitStart";
import { BigSlider, Chip, LocationPicker, ProgressBar, StepShell, money } from "./parts";
import Results from "./Results";

const TOTAL_STEPS = 9;

export default function StartFlow() {
  const startedAt = useRef<number>(Date.now());
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>("htb"); // Help to Buy is the default

  /* answers */
  const [applicantType, setApplicantType] = useState<"single" | "joint" | null>(null);
  const [dependants, setDependants] = useState<number | null>(null);
  const [income1, setIncome1] = useState(85000);
  const [income2, setIncome2] = useState(70000);
  const [firstHome, setFirstHome] = useState<boolean | null>(null);
  const [homeType, setHomeType] = useState<"new" | "existing" | null>(null);
  const [deposit, setDeposit] = useState(30000);
  const [ccLimits, setCcLimits] = useState(0);
  const [hecsBalance, setHecsBalance] = useState(0);
  const [otherLoans, setOtherLoans] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  /* location */
  const [locationData, setLocationData] = useState<LocationRow[] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ResolvedLocation | null>(null);
  const [unsureState, setUnsureState] = useState("");

  useEffect(() => {
    fetch("/data/au-postcodes.json")
      .then((r) => r.json())
      .then((rows: LocationRow[]) => setLocationData(rows))
      .catch(() => setLocationData([]));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, done]);

  const capKey = selectedLocation ? selectedLocation.capKey : unsureState;
  const region: CapRegion = selectedLocation ? selectedLocation.region : "capital_regional";
  const locationLabel = selectedLocation
    ? selectedLocation.locality
    : unsureState
      ? STATE_NAMES[unsureState] ?? ""
      : "";

  const calc = useMemo(
    () =>
      runCalc({
        applicantType: applicantType ?? "single",
        dependants: dependants ?? 0,
        income1,
        income2,
        deposit,
        homeType,
        firstHome: firstHome !== false,
        capKey,
        region,
        creditCardLimits: ccLimits,
        hecsBalance,
        otherLoanRepayments: otherLoans,
      }),
    [applicantType, dependants, income1, income2, deposit, homeType, firstHome, capKey, region, ccLimits, hecsBalance, otherLoans],
  );

  const heroPreview = mode === "htb" ? calc.htb?.maxPrice ?? 0 : calc.fhg?.maxPrice ?? 0;

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const emailOk = /.+@.+\..+/.test(email);
  const phoneOk = phone.replace(/\D/g, "").length >= 9;
  const captureOk = firstName.trim().length > 1 && emailOk && phoneOk;

  /* ── the one place the lead leaves the flow ──────────────────────────── */
  const handleSubmit = async () => {
    const payload = buildStartPayload(
      {
        applicant_type: applicantType ?? "single",
        dependants: dependants ?? 0,
        first_home_buyer: firstHome !== false,
        home_type: homeType,
        income_1: income1,
        income_2: income2,
        deposit,
        credit_card_limits: ccLimits,
        hecs_balance: hecsBalance,
        other_loan_repayments_monthly: otherLoans,
        suburb: selectedLocation?.locality ?? null,
        postcode: selectedLocation?.postcode ?? null,
        state: capKey,
        region,
        location_intent: selectedLocation ? "resolved" : "undecided",
        first_name: firstName,
        email,
        phone,
        mode_at_submit: mode,
        started_at: startedAt.current,
      },
      calc,
    );
    await submitStart(payload);
    setDone(true);
  };

  if (done) {
    return (
      <Results
        calc={calc}
        mode={mode}
        onModeChange={setMode}
        firstName={firstName.trim()}
        locationLabel={locationLabel}
      />
    );
  }

  const livePreview =
    step >= 6 && heroPreview > 0 ? (
      <motion.p
        key={Math.round(heroPreview)}
        initial={{ opacity: 0.6, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center text-[14px] text-ocean-highlight/70"
      >
        Looking like <span className="font-display text-[20px] tracking-wide text-white">{money(heroPreview)}</span> so far
      </motion.p>
    ) : null;

  return (
    <div className="min-h-screen">
      <ProgressBar step={step} total={TOTAL_STEPS} />
      <div className="mx-auto max-w-md">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepShell
              key="s0"
              title="Who's buying?"
              sub="Takes about 60 seconds. No credit check, nothing to download."
              onNext={next}
              nextDisabled={!applicantType}
            >
              <div className="space-y-3">
                <Chip wide emoji="🙋" label="Just me" selected={applicantType === "single"} onClick={() => { setApplicantType("single"); setTimeout(next, 220); }} />
                <Chip wide emoji="👫" label="Me and my partner" selected={applicantType === "joint"} onClick={() => { setApplicantType("joint"); setTimeout(next, 220); }} />
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell key="s1" title="Any kids?" sub="Lenders count dependants in your living costs." onBack={back} onNext={next} nextDisabled={dependants === null}>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((n) => (
                  <Chip
                    key={n}
                    label={n === 0 ? "No kids" : n === 3 ? "3 or more" : `${n} ${n === 1 ? "kid" : "kids"}`}
                    selected={dependants === n}
                    onClick={() => { setDependants(n); setTimeout(next, 220); }}
                  />
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              key="s2"
              title={applicantType === "joint" ? "What do you both earn?" : "What do you earn?"}
              sub="Before tax, per year. Roughly is fine."
              onBack={back}
              onNext={next}
              footNote="Include regular overtime and bonuses if you get them."
            >
              <div className="space-y-4">
                <BigSlider value={income1} onChange={setIncome1} min={30000} max={300000} step={2500} label={applicantType === "joint" ? "You" : "Your income"} />
                {applicantType === "joint" && (
                  <BigSlider value={income2} onChange={setIncome2} min={0} max={300000} step={2500} label="Your partner" />
                )}
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell key="s3" title="First home?" sub="This decides which grants and duty savings you can claim." onBack={back} onNext={next} nextDisabled={firstHome === null}>
              <div className="space-y-3">
                <Chip wide emoji="🔑" label="Yes, my first" selected={firstHome === true} onClick={() => { setFirstHome(true); setTimeout(next, 220); }} />
                <Chip wide emoji="🏠" label="I've owned before" selected={firstHome === false} onClick={() => { setFirstHome(false); setTimeout(next, 220); }} />
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              key="s4"
              title="Where are you buying?"
              sub="Price limits change by suburb — this is the big one."
              onBack={back}
              onNext={next}
              nextDisabled={!selectedLocation && !unsureState}
            >
              <LocationPicker
                data={locationData}
                selected={selectedLocation}
                onSelect={setSelectedLocation}
                unsureState={unsureState}
                onUnsureState={setUnsureState}
              />
            </StepShell>
          )}

          {step === 5 && (
            <StepShell key="s5" title="New or existing?" sub="Brand new homes get a bigger government share." onBack={back} onNext={next} nextDisabled={!homeType}>
              <div className="space-y-3">
                <Chip wide emoji="🏗️" label="Brand new build" sub="Government can take up to 40%" selected={homeType === "new"} onClick={() => { setHomeType("new"); setTimeout(next, 220); }} />
                <Chip wide emoji="🏡" label="Existing home" sub="Government can take up to 30%" selected={homeType === "existing"} onClick={() => { setHomeType("existing"); setTimeout(next, 220); }} />
              </div>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell key="s6" title="How much have you saved?" sub="Everything you could put towards the place." onBack={back} onNext={next}>
              <BigSlider value={deposit} onChange={setDeposit} min={0} max={250000} step={1000} label="Your savings" />
              {livePreview}
            </StepShell>
          )}

          {step === 7 && (
            <StepShell
              key="s7"
              title="Anything owing?"
              sub="Debts change what a lender will hand over. Slide to zero if you have none."
              onBack={back}
              onNext={next}
              footNote="Credit cards count on the limit, not what you owe — even an unused card eats into your borrowing power."
            >
              <div className="space-y-4">
                <BigSlider value={ccLimits} onChange={setCcLimits} min={0} max={60000} step={1000} label="Credit card limits (total)" />
                <BigSlider value={hecsBalance} onChange={setHecsBalance} min={0} max={150000} step={2500} label="HECS / HELP balance" />
                <BigSlider value={otherLoans} onChange={setOtherLoans} min={0} max={3000} step={50} label="Car / personal loan repayments" hint="Per month, across all of them." />
              </div>
              {livePreview}
            </StepShell>
          )}

          {step === 8 && (
            <StepShell
              key="s8"
              title="Where do we send it?"
              sub="Your numbers are ready — pop your details in to see them."
              onBack={back}
              onNext={handleSubmit}
              nextLabel="Show me my number →"
              nextDisabled={!captureOk}
              footNote="We'll only use this to talk you through your result."
            >
              <div className="space-y-3">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  className="h-16 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-[17px] text-white placeholder:text-ocean-highlight/35 outline-none focus:border-ocean-accent"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-16 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-[17px] text-white placeholder:text-ocean-highlight/35 outline-none focus:border-ocean-accent"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="h-16 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-[17px] text-white placeholder:text-ocean-highlight/35 outline-none focus:border-ocean-accent"
                />
              </div>
            </StepShell>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
