export type ExpiryStatus = 'ok' | 'expiring' | 'expired'

type CalendarDate = {
  year: number
  month: number
  day: number
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseCalendarDate(value: string): CalendarDate {
  const match = DATE_ONLY_PATTERN.exec(value)

  if (!match) {
    throw new RangeError(`Invalid expiry date: ${value}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const candidate = new Date(Date.UTC(year, month - 1, day))
  const isValid =
    year >= 1000 &&
    year <= 9999 &&
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day

  if (!isValid) {
    throw new RangeError(`Invalid expiry date: ${value}`)
  }

  return { year, month, day }
}

function calendarDayOrdinal(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / MILLISECONDS_PER_DAY
}

function localCalendarDate(date: Date): CalendarDate {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Current date must be valid')
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

export function parseExpiryDate(expirationDate: string): Date {
  const { year, month, day } = parseCalendarDate(expirationDate)
  return new Date(year, month - 1, day)
}

export function daysUntilExpiry(expirationDate: string, now: Date = new Date()): number {
  const expiryDay = parseCalendarDate(expirationDate)
  const today = localCalendarDate(now)

  return calendarDayOrdinal(expiryDay) - calendarDayOrdinal(today)
}

export function classifyExpiryDate(
  expirationDate: string,
  expiringDays: number,
  now: Date = new Date()
): ExpiryStatus {
  if (!Number.isInteger(expiringDays) || expiringDays < 0) {
    throw new RangeError('expiringDays must be a non-negative integer')
  }

  const daysRemaining = daysUntilExpiry(expirationDate, now)

  if (daysRemaining < 0) return 'expired'
  if (daysRemaining <= expiringDays) return 'expiring'
  return 'ok'
}

export function resolveExpiringDays(value: string | undefined, fallback = 3): number {
  if (!Number.isInteger(fallback) || fallback < 0) {
    throw new RangeError('fallback must be a non-negative integer')
  }

  if (value === undefined || value.trim() === '') return fallback

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}
