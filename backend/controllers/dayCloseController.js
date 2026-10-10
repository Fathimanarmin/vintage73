const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');

// Helper to format date to YYYY-MM-DD string in Asia/Kolkata (IST) timezone
// Uses Intl.DateTimeFormat so it is correct regardless of server OS timezone
const getLocalDateString = (d = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(d));
};

// Helper to get Date object at start of UTC day for @db.Date storage
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
 * @desc Get current Day Close status, active/selected business date, and pending warning
 * @route GET /api/day-close/status
 * @access Private
 */
const getDayCloseStatus = asyncHandler(async (req, res) => {
  let targetBranchId = req.query.branchId ? parseInt(req.query.branchId) : (req.user ? req.user.branchId : null);

  if (!targetBranchId) {
    const firstBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    targetBranchId = firstBranch ? firstBranch.id : 1;
  }

  const todayStr = getLocalDateString();
  const todayUtc = getUtcDateObj(todayStr);

  // 1. Look back up to 30 days for any past business dates that had sales but remain unclosed
  const thirtyDaysAgo = new Date(todayUtc);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pastSales = await prisma.sale.findMany({
    where: {
      branchId: targetBranchId,
      saleDate: {
        gte: thirtyDaysAgo,
        lt: todayUtc
      },
      status: { not: 'cancelled' }
    },
    select: { saleDate: true },
    orderBy: { saleDate: 'asc' }
  });

  const distinctPastDates = Array.from(new Set(pastSales.map(s => getLocalDateString(s.saleDate))));

  let hasPendingPrevious = false;
  let pendingDateStr = null;

  for (const pDateStr of distinctPastDates) {
    const pUtc = getUtcDateObj(pDateStr);
    const existing = await prisma.dayClose.findUnique({
      where: {
        branchId_businessDate: {
          branchId: targetBranchId,
          businessDate: pUtc
        }
      }
    });

    if (!existing || (existing.status !== 'CLOSED' && existing.status !== 'ADMIN_CLOSED')) {
      hasPendingPrevious = true;
      pendingDateStr = pDateStr;
      break;
    }
  }

  // Selected date defaults to query date if provided, or earliest pending date if present, or today's date
  let selectedDateStr = req.query.date || (hasPendingPrevious ? pendingDateStr : todayStr);

  // Fetch status of the selected date
  const selectedUtc = getUtcDateObj(selectedDateStr);
  const selectedRecord = await prisma.dayClose.findUnique({
    where: {
      branchId_businessDate: {
        branchId: targetBranchId,
        businessDate: selectedUtc
      }
    },
    include: {
      finalizedBy: { select: { id: true, name: true, username: true } },
      branch: { select: { id: true, name: true } }
    }
  });

  const isClosed = selectedRecord && (selectedRecord.status === 'CLOSED' || selectedRecord.status === 'ADMIN_CLOSED');

  res.json({
    success: true,
    branchId: targetBranchId,
    currentDate: todayStr,
    currentDateDisplay: formatDisplayDate(todayStr),
    selectedDate: selectedDateStr,
    selectedDateDisplay: formatDisplayDate(selectedDateStr),
    activeDate: selectedDateStr,
    activeDateDisplay: formatDisplayDate(selectedDateStr),
    hasPendingPrevious,
    pendingDate: pendingDateStr,
    pendingDateDisplay: pendingDateStr ? formatDisplayDate(pendingDateStr) : null,
    status: isClosed ? 'CLOSED' : 'OPEN',
    closedAt: selectedRecord?.finalizedAt || null,
    closedBy: selectedRecord?.finalizedBy?.name || selectedRecord?.finalizedBy?.username || null
  });
});

/**
 * @desc Confirm and Save Day Close for a business date
 * @route POST /api/day-close/confirm
 * @access Private
 */
const confirmDayClose = asyncHandler(async (req, res) => {
  const { branchId, businessDate: inputDateStr } = req.body;
  let targetBranchId = branchId ? parseInt(branchId) : (req.user ? req.user.branchId : null);

  if (!targetBranchId) {
    const firstBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    targetBranchId = firstBranch ? firstBranch.id : 1;
  }

  const todayStr = getLocalDateString();
  const dateStr = inputDateStr || todayStr;

  // Rule 1: Prevent future dates
  if (dateStr > todayStr) {
    res.status(400);
    throw new Error(`Cannot close future business date: ${formatDisplayDate(dateStr)}. Future dates cannot be closed.`);
  }

  const dateUtc = getUtcDateObj(dateStr);

  // Rule 2: Chronological Check: Verify no earlier date before inputDateStr is unclosed
  const thirtyDaysAgo = new Date(dateUtc);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pastSales = await prisma.sale.findMany({
    where: {
      branchId: targetBranchId,
      saleDate: {
        gte: thirtyDaysAgo,
        lt: dateUtc
      },
      status: { not: 'cancelled' }
    },
    select: { saleDate: true },
    orderBy: { saleDate: 'asc' }
  });

  const distinctPastDates = Array.from(new Set(pastSales.map(s => getLocalDateString(s.saleDate))));

  for (const pDateStr of distinctPastDates) {
    const pUtc = getUtcDateObj(pDateStr);
    const existing = await prisma.dayClose.findUnique({
      where: {
        branchId_businessDate: {
          branchId: targetBranchId,
          businessDate: pUtc
        }
      }
    });

    if (!existing || (existing.status !== 'CLOSED' && existing.status !== 'ADMIN_CLOSED')) {
      res.status(400);
      throw new Error(`Day Close Pending! You have not closed the business date ${formatDisplayDate(pDateStr)}. Please complete the pending Day Close before proceeding to a later date.`);
    }
  }

  // Rule 3: Check if already closed
  const existingRecord = await prisma.dayClose.findUnique({
    where: {
      branchId_businessDate: {
        branchId: targetBranchId,
        businessDate: dateUtc
      }
    }
  });

  if (existingRecord && (existingRecord.status === 'CLOSED' || existingRecord.status === 'ADMIN_CLOSED')) {
    res.status(400);
    throw new Error(`Day Close for ${formatDisplayDate(dateStr)} has already been completed.`);
  }

  // Save Day Close record as CLOSED
  const dayCloseRecord = await prisma.dayClose.upsert({
    where: {
      branchId_businessDate: {
        branchId: targetBranchId,
        businessDate: dateUtc
      }
    },
    update: {
      status: 'CLOSED',
      finalizedById: req.user.id,
      finalizedAt: new Date()
    },
    create: {
      branchId: targetBranchId,
      businessDate: dateUtc,
      status: 'CLOSED',
      finalizedById: req.user.id,
      finalizedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: `Day Close for ${formatDisplayDate(dateStr)} saved successfully.`,
    dayClose: dayCloseRecord
  });
});

/**
 * @desc Global check for unclosed day close warning
 * @route GET /api/day-close/check-unclosed
 * @access Private
 */
const checkUnclosed = asyncHandler(async (req, res) => {
  let targetBranchId = req.query.branchId ? parseInt(req.query.branchId) : (req.user ? req.user.branchId : null);

  if (!targetBranchId) {
    const firstBranch = await prisma.branch.findFirst({ where: { isActive: true } });
    targetBranchId = firstBranch ? firstBranch.id : (req.user?.branchId || 1);
  }

  if (!targetBranchId) {
    return res.json({ hasUnclosed: false, unclosedDate: null });
  }

  const todayStr = getLocalDateString();
  const todayUtc = getUtcDateObj(todayStr);

  const thirtyDaysAgo = new Date(todayUtc);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pastSales = await prisma.sale.findMany({
    where: {
      branchId: targetBranchId,
      saleDate: {
        gte: thirtyDaysAgo,
        lt: todayUtc
      },
      status: { not: 'cancelled' }
    },
    select: { saleDate: true },
    orderBy: { saleDate: 'asc' }
  });

  const distinctPastDates = Array.from(new Set(pastSales.map(s => getLocalDateString(s.saleDate))));

  for (const pDateStr of distinctPastDates) {
    const pUtc = getUtcDateObj(pDateStr);
    const existing = await prisma.dayClose.findUnique({
      where: {
        branchId_businessDate: {
          branchId: targetBranchId,
          businessDate: pUtc
        }
      }
    });

    if (!existing || (existing.status !== 'CLOSED' && existing.status !== 'ADMIN_CLOSED')) {
      return res.json({
        hasUnclosed: true,
        unclosedDate: pDateStr,
        unclosedDateDisplay: formatDisplayDate(pDateStr),
        message: `Day Close Pending! You have not closed the business date ${formatDisplayDate(pDateStr)}. Please complete the pending Day Close before proceeding to a later date.`
      });
    }
  }

  res.json({ hasUnclosed: false, unclosedDate: null });
});

/**
 * @desc Get Day Close History
 * @route GET /api/day-close/history
 * @access Private
 */
const getDayCloseHistory = asyncHandler(async (req, res) => {
  let targetBranchId = req.query.branchId ? parseInt(req.query.branchId) : (req.user ? req.user.branchId : null);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const where = {};
  if (targetBranchId) where.branchId = targetBranchId;

  const [total, records] = await Promise.all([
    prisma.dayClose.count({ where }),
    prisma.dayClose.findMany({
      where,
      include: {
        finalizedBy: { select: { id: true, name: true, username: true } },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { businessDate: 'desc' },
      skip,
      take: limit
    })
  ]);

  res.json({
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    records
  });
});

module.exports = {
  getDayCloseStatus,
  confirmDayClose,
  checkUnclosed,
  getDayCloseHistory
};
