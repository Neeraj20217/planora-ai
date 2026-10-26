export const MAX_BUDGET_PAISE = 10_000_000_000;

/** Input is validated before conversion. No decimal floating-point multiplication. */
export function rupeesToPaise(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) && paise <= MAX_BUDGET_PAISE
    ? paise
    : null;
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
