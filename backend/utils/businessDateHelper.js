const prisma = require('../config/prisma');

// TIMEZONE: Asia/Kolkata (IST, UTC+5:30)
// Use Intl.DateTimeFormat so the date is always correct regardless of server OS timezone.
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current date as YYYY-MM-DD in IST, or converts a given Date/string to IST date.
 */
const getLocalDateString = (d = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(new Date(d));
};

// Helper to get Date object at start of UTC day for @db.Date storage (Prisma @db.Date expects UTC midnight)
const getUtcDateObj = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Helper to format date for UI display (DD/MM/YYYY)
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Gets the authoritative active business date for a branch.
 * Returns the earliest unclosed business date with activity, or today's date (IST) if all previous dates are closed.
 * @param {number} branchId
 * @returns {Promise<{ dateStr: string, dateObj: Date, isPendingPrevious: boolean }>}
 */
async function getBranchActiveBusinessDate(branchId) {
  const todayStr = getLocalDateString(); // YYYY-MM-DD in IST
  const todayUtc = getUtcDateObj(todayStr);

  if (!branchId) {
    const [ty, tm, td] = todayStr.split('-').map(Number);
    return {
      dateStr: todayStr,
      dateObj: new Date(ty, tm - 1, td, 12, 0, 0, 0),
      isPendingPrevious: false
    };
  }

  // Look back up to 30 days for any unclosed dates with sales
  const thirtyDaysAgo = new Date(todayUtc);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pastSales = await prisma.sale.findMany({
    where: {
      branchId: parseInt(branchId),
      saleDate: {
        gte: thirtyDaysAgo,
        lt: todayUtc  // strictly before today — today's sales are added to today's open date
      },
      status: { not: 'cancelled' }
    },
    select: { saleDate: true },
    orderBy: { saleDate: 'asc' }
  });

  // Get sorted distinct past date strings (IST)
  const distinctPastDates = Array.from(new Set(pastSales.map(s => getLocalDateString(s.saleDate))));

  for (const pDateStr of distinctPastDates) {
    const pUtc = getUtcDateObj(pDateStr);
    const existing = await prisma.dayClose.findUnique({
      where: {
        branchId_businessDate: {
          branchId: parseInt(branchId),
          businessDate: pUtc
        }
      }
    });

    if (!existing || (existing.status !== 'CLOSED' && existing.status !== 'ADMIN_CLOSED')) {
      // Unclosed past date found — this is the active business date
      const [y, m, d] = pDateStr.split('-').map(Number);
      return {
        dateStr: pDateStr,
        dateObj: new Date(y, m - 1, d, 12, 0, 0, 0),
        isPendingPrevious: true
      };
    }
  }

  // All past dates are closed — today (IST) is the active business date
  const [ty, tm, td] = todayStr.split('-').map(Number);
  return {
    dateStr: todayStr,
    dateObj: new Date(ty, tm - 1, td, 12, 0, 0, 0),
    isPendingPrevious: false
  };
}

module.exports = {
  getLocalDateString,
  getUtcDateObj,
  formatDisplayDate,
  getBranchActiveBusinessDate
};
