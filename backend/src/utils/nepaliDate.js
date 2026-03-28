import NepaliDate from 'nepali-datetime'

/**
 * Nepal BS (Bikram Sambat) date utilities for leave calculation.
 * Wraps nepali-datetime library with helpers for fiscal year and accrual timing.
 */

/**
 * Convert AD date to BS date object.
 * @param {string|Date} adDate — AD date string (YYYY-MM-DD) or Date object
 * @returns {{ year: number, month: number, day: number }}
 */
export function adToBs(adDate) {
  const d = typeof adDate === 'string' ? new Date(adDate) : adDate
  const nd = new NepaliDate(d)
  return {
    year: nd.getYear(),
    month: nd.getMonth() + 1, // nepali-datetime months are 0-indexed
    day: nd.getDate()
  }
}

/**
 * Convert BS date to AD Date object.
 * @param {{ year: number, month: number, day: number }} bsDate
 * @returns {Date}
 */
export function bsToAd(bsDate) {
  // nepali-datetime constructor: new NepaliDate(year, monthIndex, day)
  const nd = new NepaliDate(bsDate.year, bsDate.month - 1, bsDate.day)
  const adDate = nd.getDateObject()
  // Normalize to date-only (Nepal is UTC+5:45, so getDateObject returns previous day in UTC)
  // Use the English date components from the library directly
  const y = nd.getEnglishYear()
  const m = nd.getEnglishMonth() // 0-indexed
  const d = nd.getEnglishDate()
  return new Date(y, m, d)
}

/**
 * Get the number of days in a BS month.
 * @param {number} bsYear
 * @param {number} bsMonth — 1-indexed (1=Baisakh, 12=Chaitra)
 * @returns {number}
 */
export function getDaysInBsMonth(bsYear, bsMonth) {
  const startAd = bsToAd({ year: bsYear, month: bsMonth, day: 1 })
  let endYear = bsYear
  let endMonth = bsMonth + 1
  if (endMonth > 12) {
    endYear += 1
    endMonth = 1
  }
  const endAd = bsToAd({ year: endYear, month: endMonth, day: 1 })
  return Math.round((endAd.getTime() - startAd.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Determine Nepal fiscal year boundaries for a given AD date.
 * Nepal FY runs Shrawan 1 (BS month 4) to Ashadh end (BS month 3).
 *
 * @param {string|Date} todayAd
 * @returns {{ fyStartAd: Date, fyEndAd: Date, fyStartBs: object, fyEndBs: object, bsFiscalYear: string }}
 */
export function getCurrentFiscalYear(todayAd) {
  const todayBs = adToBs(todayAd)

  let fyStartBs, fyEndBs

  if (todayBs.month >= 4) {
    // Shrawan (month 4) or later — current BS year's FY
    fyStartBs = { year: todayBs.year, month: 4, day: 1 }
    fyEndBs = {
      year: todayBs.year + 1,
      month: 3,
      day: getDaysInBsMonth(todayBs.year + 1, 3)
    }
  } else {
    // Baisakh (1) through Ashadh (3) — previous BS year's FY
    fyStartBs = { year: todayBs.year - 1, month: 4, day: 1 }
    fyEndBs = {
      year: todayBs.year,
      month: 3,
      day: getDaysInBsMonth(todayBs.year, 3)
    }
  }

  return {
    fyStartAd: bsToAd(fyStartBs),
    fyEndAd: bsToAd(fyEndBs),
    fyStartBs,
    fyEndBs,
    bsFiscalYear: `${fyStartBs.year}/${String(fyStartBs.year + 1).slice(-2)}`
  }
}

/**
 * Count how many BS month boundaries have been crossed from startBs to asOfAd.
 * Used for leave accrual calculation (1 day per BS month for sick leave, 1.5 for home).
 *
 * @param {{ year: number, month: number, day: number }} startBs
 * @param {string|Date} asOfAd
 * @returns {number}
 */
export function countBsMonthsElapsed(startBs, asOfAd) {
  const currentBs = adToBs(asOfAd)

  // Same month and year
  if (currentBs.year === startBs.year && currentBs.month === startBs.month) {
    return 1 // Count the starting month
  }

  let months = 0

  // Full years
  let fullYears = currentBs.year - startBs.year
  if (currentBs.month < startBs.month) {
    fullYears -= 1
  }
  months = fullYears * 12

  // Remaining months
  if (currentBs.month >= startBs.month) {
    months += (currentBs.month - startBs.month)
  } else {
    months += (12 - startBs.month + currentBs.month)
  }

  // Add 1 because we count the starting month
  months += 1

  return months
}

/**
 * Count working days between two AD dates, excluding a weekly off day.
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @param {string} weeklyOffDay — 'Saturday', 'Sunday', etc.
 * @returns {number}
 */
export function countWorkingDays(startDate, endDate, weeklyOffDay = 'Saturday') {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const offDayIndex = dayNames.indexOf(weeklyOffDay)

  const start = new Date(startDate)
  const end = new Date(endDate)
  let count = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== offDayIndex) {
      count++
    }
  }

  return count
}

/**
 * Count consecutive calendar days between two dates (inclusive).
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {number}
 */
export function countConsecutiveCalendarDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Calculate days between two dates.
 * @param {string|Date} endDate
 * @param {string|Date} startDate
 * @returns {number}
 */
export function daysBetween(endDate, startDate) {
  const e = new Date(endDate)
  const s = new Date(startDate)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}
