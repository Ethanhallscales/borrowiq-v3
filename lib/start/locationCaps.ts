/* ============================================================
   LOCATION-RESOLVED SCHEME PRICE CAPS
   Both cap tables verified against firsthomebuyers.gov.au /
   housingaustralia.gov.au (via CommBank's scheme pages, which mirror
   the official tables) as at Aug 2026. Update this file only when
   caps are revised — nothing else should need to change.

   Region keys match what public/data/au-postcodes.json resolves to:
   "capital_regional" = Greater Capital City area, or a named 250k+
   regional centre (Gold Coast, Sunshine Coast, Newcastle & Lake
   Macquarie, Illawarra, Geelong). "rest_of_state" = everywhere else.
   States with a single national cap (ACT, JBT, CKI) repeat the same
   number under both keys so lookups never need special-casing.
   ============================================================ */

export type CapRegion = "capital_regional" | "rest_of_state";
export type Scheme = "htb" | "fhg";

export const CAP_TABLES: Record<Scheme, Record<string, Record<CapRegion, number>>> = {
  htb: {
    QLD: { capital_regional: 1000000, rest_of_state: 700000 },
    NSW: { capital_regional: 1300000, rest_of_state: 800000 },
    VIC: { capital_regional: 950000, rest_of_state: 650000 },
    WA: { capital_regional: 850000, rest_of_state: 600000 },
    SA: { capital_regional: 900000, rest_of_state: 500000 },
    TAS: { capital_regional: 700000, rest_of_state: 550000 },
    ACT: { capital_regional: 1000000, rest_of_state: 1000000 },
    NT: { capital_regional: 600000, rest_of_state: 600000 },
    JBT: { capital_regional: 550000, rest_of_state: 550000 },
    CKI: { capital_regional: 400000, rest_of_state: 400000 },
  },
  fhg: {
    QLD: { capital_regional: 1000000, rest_of_state: 700000 },
    NSW: { capital_regional: 1500000, rest_of_state: 800000 },
    VIC: { capital_regional: 950000, rest_of_state: 650000 },
    WA: { capital_regional: 850000, rest_of_state: 600000 },
    SA: { capital_regional: 900000, rest_of_state: 500000 },
    TAS: { capital_regional: 700000, rest_of_state: 550000 },
    ACT: { capital_regional: 1000000, rest_of_state: 1000000 },
    NT: { capital_regional: 750000, rest_of_state: 600000 },
    JBT: { capital_regional: 550000, rest_of_state: 550000 },
    CKI: { capital_regional: 400000, rest_of_state: 400000 },
  },
};

export const STATE_NAMES: Record<string, string> = {
  QLD: "Queensland",
  NSW: "New South Wales",
  VIC: "Victoria",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
  JBT: "Jervis Bay Territory & Norfolk Island",
  CKI: "Christmas Island & Cocos (Keeling) Islands",
};

// Only states with their own postcode search entry point in the autocomplete's
// "Not sure where yet?" fallback — JBT/CKI are resolved via postcode match only.
export const SELECTABLE_STATES = ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "ACT", "NT"] as const;

export const STATE_CAPITAL_CITY: Record<string, string> = {
  QLD: "Brisbane",
  NSW: "Sydney",
  VIC: "Melbourne",
  WA: "Perth",
  SA: "Adelaide",
  TAS: "Hobart",
  ACT: "Canberra",
  NT: "Darwin",
};

// [postcode, locality, displayState, capKey, region]
export type LocationRow = [string, string, string, string, CapRegion];

export type ResolvedLocation = {
  postcode: string;
  locality: string;
  displayState: string;
  capKey: string;
  region: CapRegion;
};

export function rowToLocation(row: LocationRow): ResolvedLocation {
  return { postcode: row[0], locality: row[1], displayState: row[2], capKey: row[3], region: row[4] };
}

export function capFor(scheme: Scheme, capKey: string, region: CapRegion): number | null {
  return CAP_TABLES[scheme][capKey]?.[region] ?? null;
}
