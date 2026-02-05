/**
 * CountryDisplay component - shows a country flag with dial code.
 * Uses flag-icons CSS library for SVG flags.
 */

// Mapping of ISO 3166-1 alpha-2 country codes to dial codes
const COUNTRY_DATA: Record<string, { dialCode: string; name: string }> = {
  AF: { dialCode: "+93", name: "Afghanistan" },
  AL: { dialCode: "+355", name: "Albania" },
  DZ: { dialCode: "+213", name: "Algeria" },
  AR: { dialCode: "+54", name: "Argentina" },
  AU: { dialCode: "+61", name: "Australia" },
  AT: { dialCode: "+43", name: "Austria" },
  BE: { dialCode: "+32", name: "Belgium" },
  BR: { dialCode: "+55", name: "Brazil" },
  CA: { dialCode: "+1", name: "Canada" },
  CL: { dialCode: "+56", name: "Chile" },
  CN: { dialCode: "+86", name: "China" },
  CO: { dialCode: "+57", name: "Colombia" },
  CZ: { dialCode: "+420", name: "Czech Republic" },
  DK: { dialCode: "+45", name: "Denmark" },
  EG: { dialCode: "+20", name: "Egypt" },
  FI: { dialCode: "+358", name: "Finland" },
  FR: { dialCode: "+33", name: "France" },
  DE: { dialCode: "+49", name: "Germany" },
  GR: { dialCode: "+30", name: "Greece" },
  HK: { dialCode: "+852", name: "Hong Kong" },
  HU: { dialCode: "+36", name: "Hungary" },
  IN: { dialCode: "+91", name: "India" },
  ID: { dialCode: "+62", name: "Indonesia" },
  IE: { dialCode: "+353", name: "Ireland" },
  IL: { dialCode: "+972", name: "Israel" },
  IT: { dialCode: "+39", name: "Italy" },
  JP: { dialCode: "+81", name: "Japan" },
  KR: { dialCode: "+82", name: "South Korea" },
  MY: { dialCode: "+60", name: "Malaysia" },
  MX: { dialCode: "+52", name: "Mexico" },
  NL: { dialCode: "+31", name: "Netherlands" },
  NZ: { dialCode: "+64", name: "New Zealand" },
  NO: { dialCode: "+47", name: "Norway" },
  PK: { dialCode: "+92", name: "Pakistan" },
  PE: { dialCode: "+51", name: "Peru" },
  PH: { dialCode: "+63", name: "Philippines" },
  PL: { dialCode: "+48", name: "Poland" },
  PT: { dialCode: "+351", name: "Portugal" },
  RO: { dialCode: "+40", name: "Romania" },
  RU: { dialCode: "+7", name: "Russia" },
  SA: { dialCode: "+966", name: "Saudi Arabia" },
  SG: { dialCode: "+65", name: "Singapore" },
  ZA: { dialCode: "+27", name: "South Africa" },
  ES: { dialCode: "+34", name: "Spain" },
  SE: { dialCode: "+46", name: "Sweden" },
  CH: { dialCode: "+41", name: "Switzerland" },
  TW: { dialCode: "+886", name: "Taiwan" },
  TH: { dialCode: "+66", name: "Thailand" },
  TR: { dialCode: "+90", name: "Turkey" },
  UA: { dialCode: "+380", name: "Ukraine" },
  AE: { dialCode: "+971", name: "United Arab Emirates" },
  GB: { dialCode: "+44", name: "United Kingdom" },
  US: { dialCode: "+1", name: "United States" },
  VN: { dialCode: "+84", name: "Vietnam" },
};

// Reverse mapping: dial codes to ISO codes (for legacy data with dial codes)
const DIAL_CODE_TO_ISO: Record<string, string> = {};
Object.entries(COUNTRY_DATA).forEach(([iso, data]) => {
  // Handle the dial code without the +
  const code = data.dialCode.replace("+", "");
  if (!DIAL_CODE_TO_ISO[code]) {
    DIAL_CODE_TO_ISO[code] = iso;
  }
});

interface CountryDisplayProps {
  /** ISO country code (e.g., "AU") or dial code (e.g., "+61") */
  countryCode: string | null | undefined;
  /** Whether to show the dial code text alongside the flag */
  showDialCode?: boolean;
  /** Size of the flag: "sm" (12px), "md" (16px), "lg" (20px) */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Normalizes a country code input to an ISO code.
 * Handles both ISO codes ("AU") and dial codes ("+61", "61", "+6").
 */
function normalizeToIso(input: string): string | null {
  if (!input) return null;

  const cleaned = input.trim().toUpperCase();

  // If it's already a valid 2-letter ISO code
  if (cleaned.length === 2 && COUNTRY_DATA[cleaned]) {
    return cleaned;
  }

  // If it starts with +, try to find the dial code
  if (input.startsWith("+")) {
    const dialDigits = input.slice(1);
    // Try matching progressively longer dial codes (1, 12, 123...)
    for (let len = dialDigits.length; len >= 1; len--) {
      const partial = dialDigits.slice(0, len);
      if (DIAL_CODE_TO_ISO[partial]) {
        return DIAL_CODE_TO_ISO[partial];
      }
    }
  }

  // Try as raw digits
  const digits = input.replace(/\D/g, "");
  for (let len = digits.length; len >= 1; len--) {
    const partial = digits.slice(0, len);
    if (DIAL_CODE_TO_ISO[partial]) {
      return DIAL_CODE_TO_ISO[partial];
    }
  }

  return null;
}

export function CountryDisplay({
  countryCode,
  showDialCode = true,
  size = "md",
  className = "",
}: CountryDisplayProps) {
  if (!countryCode) {
    return <span className={className}>Unknown</span>;
  }

  const isoCode = normalizeToIso(countryCode);

  if (!isoCode) {
    // Fallback: just show what we have
    return <span className={className}>{countryCode}</span>;
  }

  const countryInfo = COUNTRY_DATA[isoCode];
  const flagCode = isoCode.toLowerCase();

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const flagSizeStyles = {
    sm: { width: "16px", height: "12px" },
    md: { width: "20px", height: "15px" },
    lg: { width: "24px", height: "18px" },
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={countryInfo?.name}
    >
      <span
        className={`fi fi-${flagCode} rounded-[2px]`}
        style={{
          ...flagSizeStyles[size],
          display: "inline-block",
          backgroundSize: "cover",
        }}
        aria-label={countryInfo?.name}
      />
      {showDialCode && countryInfo && (
        <span className={sizeClasses[size]}>{countryInfo.dialCode}</span>
      )}
    </span>
  );
}

/**
 * Get country info from ISO or dial code.
 */
export function getCountryInfo(countryCode: string | null | undefined) {
  if (!countryCode) return null;
  const isoCode = normalizeToIso(countryCode);
  if (!isoCode) return null;
  return { isoCode, ...COUNTRY_DATA[isoCode] };
}
