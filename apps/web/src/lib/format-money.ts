/** Display currency for EliteFlow UI. Amounts are not converted. */
export const DISPLAY_CURRENCY = "PKR";
export const DISPLAY_CURRENCY_LOCALE = "en-PK";

export function formatMoney(
  value: number | null | undefined,
  storedCurrency?: string,
): string {
  void storedCurrency;
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat(DISPLAY_CURRENCY_LOCALE, {
    style: "currency",
    currency: DISPLAY_CURRENCY,
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
