export function formatMoney(amount: number, currency: string, locale?: string | null): string {
  try {
    return new Intl.NumberFormat(locale ?? undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Unknown currency code — fall back to a plain number with the code appended.
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatDay(isoDate: string, locale?: string | null): string {
  const parsed = new Date(`${isoDate}T00:00:00`)
  return new Intl.DateTimeFormat(locale ?? undefined, {
    day: 'numeric',
    month: 'short',
  }).format(parsed)
}

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
