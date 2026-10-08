/**
 * Region codes for the force-region picker. Only codes are stored: country
 * names come from `Intl.DisplayNames` at runtime, so the list stays small and
 * never drifts from the browser's own naming. Subdivision names aren't in
 * `Intl`, so the US states (where state privacy laws make per-state testing
 * matter) are listed with names.
 */

/** ISO 3166-1 alpha-2 country codes. */
export const COUNTRY_CODES: readonly string[] = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS " +
  "BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE " +
  "EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM " +
  "HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC " +
  "LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA " +
  "NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO " +
  "TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

/** US states and DC, as `US-XX` codes — the shape `regionFromHeaders` produces. */
export const US_STATES: Readonly<Record<string, string>> = {
  "US-AL": "Alabama",
  "US-AK": "Alaska",
  "US-AZ": "Arizona",
  "US-AR": "Arkansas",
  "US-CA": "California",
  "US-CO": "Colorado",
  "US-CT": "Connecticut",
  "US-DE": "Delaware",
  "US-DC": "District of Columbia",
  "US-FL": "Florida",
  "US-GA": "Georgia",
  "US-HI": "Hawaii",
  "US-ID": "Idaho",
  "US-IL": "Illinois",
  "US-IN": "Indiana",
  "US-IA": "Iowa",
  "US-KS": "Kansas",
  "US-KY": "Kentucky",
  "US-LA": "Louisiana",
  "US-ME": "Maine",
  "US-MD": "Maryland",
  "US-MA": "Massachusetts",
  "US-MI": "Michigan",
  "US-MN": "Minnesota",
  "US-MS": "Mississippi",
  "US-MO": "Missouri",
  "US-MT": "Montana",
  "US-NE": "Nebraska",
  "US-NV": "Nevada",
  "US-NH": "New Hampshire",
  "US-NJ": "New Jersey",
  "US-NM": "New Mexico",
  "US-NY": "New York",
  "US-NC": "North Carolina",
  "US-ND": "North Dakota",
  "US-OH": "Ohio",
  "US-OK": "Oklahoma",
  "US-OR": "Oregon",
  "US-PA": "Pennsylvania",
  "US-RI": "Rhode Island",
  "US-SC": "South Carolina",
  "US-SD": "South Dakota",
  "US-TN": "Tennessee",
  "US-TX": "Texas",
  "US-UT": "Utah",
  "US-VT": "Vermont",
  "US-VA": "Virginia",
  "US-WA": "Washington",
  "US-WV": "West Virginia",
  "US-WI": "Wisconsin",
  "US-WY": "Wyoming",
};

/** One-click presets for the regions people test most: one per regulation family. */
export const QUICK_REGIONS: readonly { code: string; label: string }[] = [
  { code: "DE", label: "EU" },
  { code: "GB", label: "UK" },
  { code: "US-CA", label: "California" },
  { code: "US-NY", label: "New York" },
  { code: "BR", label: "Brazil" },
  { code: "IN", label: "India" },
];

/** The shape `regionFromHeaders` returns: a country, optionally `-` and a subdivision. */
const REGION_CODE = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;

/** Normalises typed text to a region code, or `undefined` when it can't be one. */
export function toRegionCode(query: string): string | undefined {
  const code = query.trim().toUpperCase();
  return REGION_CODE.test(code) ? code : undefined;
}

let countryNames: Intl.DisplayNames | undefined;

/** The English name for a region code, falling back to the code itself. */
export function regionName(code: string): string {
  const state = US_STATES[code];
  if (state) return state;
  try {
    countryNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    const country = countryNames.of(code.slice(0, 2));
    if (!country) return code;
    return code.length > 2 ? `${country} (${code.slice(3)})` : country;
  } catch {
    return code;
  }
}
