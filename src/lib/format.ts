// Fixed en-US style formatting (1,234.56) regardless of the workspace locale.
const NUMBER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(amount: number, currency: string): string {
  return `${NUMBER.format(amount)} ${currency}`
}

export function formatDay(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(parsed)
}

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
