"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { runCalc, type Mode } from "@/lib/start/startCalc";
import { STATE_NAMES, type LocationRow, type ResolvedLocation, type CapRegion } from "@/lib/start/locationCaps";
import { buildStartPayload, submitStart } from "./submitStart";
import { Chip, LocationPicker, MoneyInput, ProgressBar, StepShell, money, toMonthly, type Period } from "./parts";
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
  const [income1, setIncome1] = useState(0);
  const [income2, setIncome2] = useState(0);
  /* supplementary income — held in whatever period the user picked, and
     converted to monthly at the point it reaches the calc engine. */
  const [childSupport, setChildSupport] = useState(0);
  const [childSupportPeriod, setChildSupportPeriod] = useState<Period>("fortnight");
  const [familyPayments, setFamilyPayments] = useState(0);
  const [familyPaymentsPeriod, setFamilyPaymentsPeriod] = useState<Period>("fortnight");
  const [otherGovSupport, setOtherGovSupport] = useState(0);
  const [otherGovSupportPeriod, setOtherGovSupportPeriod] = useState<Period>("fortnight");
  const [firstHome, setFirstHome] = useState<boolean | null>(null);
  const [homeType, setHomeType] = useState<"new" | "existing" | null>(null);
  const [deposit, setDeposit] = useState(0);
  const [ccLimits, setCcLimits] = useState(0);
  const [hecsBalance, setHecsBalance] = useState(0);
  const [otherLoans, setOtherLoans] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  /* attribution — /start is the paid-ad landing page, so the UTMs on the
     first page view are the ones that matter. Captured once on mount. */
  const utm = useRef({ source: "", medium: "", campaign: "", content: "" });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    utm.current = {
      source: q.get("utm_source") ?? "",
      medium: q.get("utm_medium") ?? "",
      campaign: q.get("utm_campaign") ?? "",
      content: q.get("utm_content") ?? "",
    };
  }, []);

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

  const hasChildren = (dependants ?? 0) > 0;
  // Child-linked payments only count while they actually have children —
  // clearing them here means going back and answering "No children" can't
  // leave a stale amount inflating the result.
  const childSupportMonthly = hasChildren ? toMonthly(childSupport, childSupportPeriod) : 0;
  const familyPaymentsMonthly = hasChildren ? toMonthly(familyPayments, familyPaymentsPeriod) : 0;
  const otherGovSupportMonthly = toMonthly(otherGovSupport, otherGovSupportPeriod);

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
        childSupportMonthly,
        familyPaymentsMonthly,
        otherGovSupportMonthly,
        creditCardLimits: ccLimits,
        hecsBalance,
        otherLoanRepayments: otherLoans,
      }),
    [applicantType, dependants, income1, income2, deposit, homeType, firstHome, capKey, region, ccLimits, hecsBalance, otherLoans, childSupportMonthly, familyPaymentsMonthly, otherGovSupportMonthly],
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
        child_support_monthly: childSupportMonthly,
        family_payments_monthly: familyPaymentsMonthly,
        other_gov_support_monthly: otherGovSupportMonthly,
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
        utm_source: utm.current.source,
        utm_medium: utm.current.medium,
        utm_campaign: utm.current.campaign,
        utm_content: utm.current.content,
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
        className="mt-4 text-center text-[14px] text-[#4E6C8B]"
      >
        Currently tracking at <span className="font-display text-[20px] tracking-wide text-[#0B2C4A]">{money(heroPreview)}</span>
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
              sub="It takes about 60 seconds. No credit check, nothing to download."
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
            <StepShell key="s1" title="Do you have any children?" sub="Lenders count dependants in your living costs." onBack={back} onNext={next} nextDisabled={dependants === null}>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((n) => (
                  <Chip
                    key={n}
                    label={n === 0 ? "No children" : n === 3 ? "3 or more" : `${n} ${n === 1 ? "child" : "children"}`}
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
              sub="Before tax, per year. An estimate is fine."
              onBack={back}
              onNext={next}
              nextDisabled={income1 <= 0}
              footNote="Include regular overtime and bonuses if you receive them. Child support and government payments are tax free, so enter the amount you actually receive."
            >
              <div className="space-y-4">
                <MoneyInput
                  value={income1}
                  onChange={setIncome1}
                  label={applicantType === "joint" ? "You" : "Your income"}
                  placeholder="85,000"
                  max={500000}
                  maxMessage="That's higher than most salaries — check you haven't added an extra zero."
                />
                {applicantType === "joint" && (
                  <MoneyInput
                    value={income2}
                    onChange={setIncome2}
                    label="Your partner"
                    placeholder="70,000"
                    max={500000}
                    maxMessage="That's higher than most salaries — check you haven't added an extra zero."
                  />
                )}

                <div className="pt-2">
                  <p className="text-[13px] uppercase tracking-[0.14em] text-[#7C93A9]">Other income</p>
                  <p className="mt-1 text-[14px] leading-snug text-[#6B87A3]">
                    Lenders count these towards what you can borrow. Leave anything that doesn&apos;t apply at 0.
                  </p>
                </div>

                {/* Child-linked payments — only asked when there are children. */}
                {hasChildren && (
                  <>
                    <MoneyInput
                      value={childSupport}
                      onChange={setChildSupport}
                      period={childSupportPeriod}
                      onPeriodChange={setChildSupportPeriod}
                      label="Child support received"
                      placeholder="0"
                      hint="Maintenance you receive, not what you pay out."
                    />
                    <MoneyInput
                      value={familyPayments}
                      onChange={setFamilyPayments}
                      period={familyPaymentsPeriod}
                      onPeriodChange={setFamilyPaymentsPeriod}
                      label="Family Tax Benefit"
                      placeholder="0"
                      hint="Family Tax Benefit Part A and Part B combined."
                    />
                  </>
                )}

                <MoneyInput
                  value={otherGovSupport}
                  onChange={setOtherGovSupport}
                  period={otherGovSupportPeriod}
                  onPeriodChange={setOtherGovSupportPeriod}
                  label="Other government payments"
                  placeholder="0"
                  hint="Disability Support Pension, Carer Payment, Age Pension and similar."
                />
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell key="s3" title="First home?" sub="This determines which grants and stamp duty concessions you can claim." onBack={back} onNext={next} nextDisabled={firstHome === null}>
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
              sub="Property price limits change by suburb, so this one matters."
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
            <StepShell key="s5" title="New or existing?" sub="The government can contribute a larger share on a brand new home." onBack={back} onNext={next} nextDisabled={!homeType}>
              <div className="space-y-3">
                <Chip wide emoji="🏗️" label="Brand new build" sub="The government can take up to 40%" selected={homeType === "new"} onClick={() => { setHomeType("new"); setTimeout(next, 220); }} />
                <Chip wide emoji="🏡" label="Existing home" sub="The government can take up to 30%" selected={homeType === "existing"} onClick={() => { setHomeType("existing"); setTimeout(next, 220); }} />
              </div>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell
              key="s6"
              title="How much have you saved?"
              sub="Everything you could put towards the purchase."
              onBack={back}
              onNext={next}
              nextDisabled={deposit <= 0}
            >
              <MoneyInput
                value={deposit}
                onChange={setDeposit}
                label="Your savings"
                placeholder="50,000"
                hint="Include anything gifted or already set aside for the purchase."
              />
              {livePreview}
            </StepShell>
          )}

          {step === 7 && (
            <StepShell
              key="s7"
              title="Do you have any debts?"
              sub="Debts reduce what a lender will approve. Enter 0 in any field that doesn't apply."
              onBack={back}
              onNext={next}
              footNote="Credit cards are assessed on the limit, not the balance owing — even an unused card reduces your borrowing power."
            >
              <div className="space-y-4">
                <MoneyInput
                  value={ccLimits}
                  onChange={setCcLimits}
                  label="Credit card limits (total)"
                  placeholder="0"
                  hint="The total limit across all your cards. Enter 0 if you have none."
                />
                <MoneyInput
                  value={hecsBalance}
                  onChange={setHecsBalance}
                  label="HECS / HELP balance"
                  placeholder="0"
                  hint="Your outstanding balance. Enter 0 if you have none."
                />
                <MoneyInput
                  value={otherLoans}
                  onChange={setOtherLoans}
                  label="Car / personal loan repayments"
                  placeholder="0"
                  suffix="per month"
                  hint="The combined monthly repayment across all of them. Enter 0 if you have none."
                />
              </div>
              {livePreview}
            </StepShell>
          )}

          {step === 8 && (
            <StepShell
              key="s8"
              title="Where do we send it?"
              sub="Your results are ready. Enter your details to see them."
              onBack={back}
              onNext={handleSubmit}
              nextLabel="Show my results →"
              nextDisabled={!captureOk}
              footNote="We'll only use these details to talk you through your results."
            >
              <div className="space-y-3">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  className="h-16 w-full rounded-2xl border border-[#D6E6F5] bg-white px-5 text-[17px] text-[#0B2C4A] outline-none placeholder:text-[#9DB2C6] focus:border-[#0076BE]"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-16 w-full rounded-2xl border border-[#D6E6F5] bg-white px-5 text-[17px] text-[#0B2C4A] outline-none placeholder:text-[#9DB2C6] focus:border-[#0076BE]"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="h-16 w-full rounded-2xl border border-[#D6E6F5] bg-white px-5 text-[17px] text-[#0B2C4A] outline-none placeholder:text-[#9DB2C6] focus:border-[#0076BE]"
                />
              </div>
            </StepShell>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
