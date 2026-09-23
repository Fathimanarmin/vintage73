const prisma = require('../config/prisma');
const { calculateLedgerBalance } = require('./accountingController');
const asyncHandler = require('../middleware/asyncHandler');

// ==================== TRIAL BALANCE ====================

exports.getTrialBalance = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const ledgers = await prisma.ledger.findMany({
    where: { isActive: true },
    include: { group: true },
    orderBy: { name: 'asc' }
  });

  // 1. Get Pre-Period Totals (Opening Balances)
  const preDebits = await prisma.journalEntry.groupBy({
    by: ['debitLedgerId'],
    _sum: { amount: true },
    where: {
      debitLedgerId: { not: null },
      voucher: { status: 'POSTED', ...(start ? { date: { lt: start } } : { id: -1 }) } // If no start, no pre-entries
    }
  });

  const preCredits = await prisma.journalEntry.groupBy({
    by: ['creditLedgerId'],
    _sum: { amount: true },
    where: {
      creditLedgerId: { not: null },
      voucher: { status: 'POSTED', ...(start ? { date: { lt: start } } : { id: -1 }) }
    }
  });

  // 2. Get Period Totals
  const periodDebits = await prisma.journalEntry.groupBy({
    by: ['debitLedgerId'],
    _sum: { amount: true },
    where: {
      debitLedgerId: { not: null },
      voucher: {
        status: 'POSTED',
        date: { gte: start || new Date(0), lte: end }
      }
    }
  });

  const periodCredits = await prisma.journalEntry.groupBy({
    by: ['creditLedgerId'],
    _sum: { amount: true },
    where: {
      creditLedgerId: { not: null },
      voucher: {
        status: 'POSTED',
        date: { gte: start || new Date(0), lte: end }
      }
    }
  });

  // Helper maps for quick lookup
  const preDebMap = new Map(preDebits.map(i => [i.debitLedgerId, Number(i._sum.amount || 0)]));
  const preCredMap = new Map(preCredits.map(i => [i.creditLedgerId, Number(i._sum.amount || 0)]));
  const perDebMap = new Map(periodDebits.map(i => [i.debitLedgerId, Number(i._sum.amount || 0)]));
  const perCredMap = new Map(periodCredits.map(i => [i.creditLedgerId, Number(i._sum.amount || 0)]));

  const trialBalance = ledgers.map(ledger => {
    const preDeb = preDebMap.get(ledger.id) || 0;
    const preCred = preCredMap.get(ledger.id) || 0;
    const perDeb = perDebMap.get(ledger.id) || 0;
    const perCred = perCredMap.get(ledger.id) || 0;

    let openingBalance = Number(ledger.openingBalance);
    // Adjust opening if a start date was provided
    if (start) {
      if (ledger.balanceType === 'DEBIT') {
        openingBalance += preDeb - preCred;
      } else {
        openingBalance += preCred - preDeb;
      }
    }

    const debitValue = perDeb;
    const creditValue = perCred;

    let closingBalance = 0;
    if (ledger.balanceType === 'DEBIT') {
      closingBalance = openingBalance + debitValue - creditValue;
    } else {
      closingBalance = openingBalance + creditValue - debitValue;
    }

    return {
      ledgerId: ledger.id,
      ledgerName: ledger.name,
      groupName: ledger.group.name,
      groupType: ledger.group.groupType,
      balanceType: ledger.balanceType,
      openingBalance,
      debit: debitValue,
      credit: creditValue,
      closingBalance
    };
  });

  const filteredResults = trialBalance.filter(item =>
    Math.abs(item.openingBalance) > 0.01 ||
    item.debit > 0 ||
    item.credit > 0 ||
    Math.abs(item.closingBalance) > 0.01
  );

  res.json({
    trialBalance: filteredResults,
    totalOpening: filteredResults.reduce((sum, i) => sum + i.openingBalance, 0),
    totalDebit: filteredResults.reduce((sum, i) => sum + i.debit, 0),
    totalCredit: filteredResults.reduce((sum, i) => sum + i.credit, 0),
    totalClosing: filteredResults.reduce((sum, i) => sum + i.closingBalance, 0)
  });
});

// ==================== PROFIT & LOSS ====================

exports.getProfitLoss = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  // Get all income and expense ledgers
  const ledgers = await prisma.ledger.findMany({
    where: {
      isActive: true,
      group: { groupType: { in: ['INCOME', 'EXPENSES'] } }
    },
    include: { group: true }
  });

  // Calculate balances in bulk
  const [debitSums, creditSums] = await Promise.all([
    prisma.journalEntry.groupBy({
      by: ['debitLedgerId'],
      _sum: { amount: true },
      where: {
        debitLedgerId: { in: ledgers.map(l => l.id) },
        voucher: { status: 'POSTED', date: { gte: start || new Date(0), lte: end } }
      }
    }),
    prisma.journalEntry.groupBy({
      by: ['creditLedgerId'],
      _sum: { amount: true },
      where: {
        creditLedgerId: { in: ledgers.map(l => l.id) },
        voucher: { status: 'POSTED', date: { gte: start || new Date(0), lte: end } }
      }
    })
  ]);

  const debMap = new Map(debitSums.map(s => [s.debitLedgerId, Number(s._sum.amount || 0)]));
  const credMap = new Map(creditSums.map(s => [s.creditLedgerId, Number(s._sum.amount || 0)]));

  const incomeItems = [];
  const expenseItems = [];

  for (const ledger of ledgers) {
    const totalDebit = debMap.get(ledger.id) || 0;
    const totalCredit = credMap.get(ledger.id) || 0;

    let balance = 0;
    // For P&L, we usually only care about the net movement in the period
    // If opening balance should be included (e.g., retained earnings), it's handled differently.
    // Standard P&L is just period transactions.
    if (ledger.balanceType === 'DEBIT') {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    if (Math.abs(balance) > 0.01) {
      const item = {
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        groupName: ledger.group.name,
        amount: balance
      };

      if (ledger.group.groupType === 'INCOME') {
        incomeItems.push(item);
      } else {
        expenseItems.push(item);
      }
    }
  }

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  res.json({
    income: incomeItems,
    expenses: expenseItems,
    totalIncome,
    totalExpenses,
    netProfit,
    isProfitable: netProfit >= 0
  });
});

// ==================== BALANCE SHEET ====================

exports.getBalanceSheet = asyncHandler(async (req, res) => {
  const { asOfDate } = req.query;
  const end = asOfDate ? new Date(asOfDate) : new Date();
  end.setHours(23, 59, 59, 999);

  // Get all asset, liability, and equity ledgers
  const ledgers = await prisma.ledger.findMany({
    where: {
      isActive: true,
      group: { groupType: { in: ['ASSETS', 'LIABILITIES', 'EQUITY'] } }
    },
    include: { group: true }
  });

  const [debitSums, creditSums] = await Promise.all([
    prisma.journalEntry.groupBy({
      by: ['debitLedgerId'],
      _sum: { amount: true },
      where: {
        debitLedgerId: { in: ledgers.map(l => l.id) },
        voucher: { status: 'POSTED', date: { lte: end } }
      }
    }),
    prisma.journalEntry.groupBy({
      by: ['creditLedgerId'],
      _sum: { amount: true },
      where: {
        creditLedgerId: { in: ledgers.map(l => l.id) },
        voucher: { status: 'POSTED', date: { lte: end } }
      }
    })
  ]);

  const debMap = new Map(debitSums.map(s => [s.debitLedgerId, Number(s._sum.amount || 0)]));
  const credMap = new Map(creditSums.map(s => [s.creditLedgerId, Number(s._sum.amount || 0)]));

  const assets = [];
  const liabilities = [];
  const equity = [];

  for (const ledger of ledgers) {
    const totalDebit = debMap.get(ledger.id) || 0;
    const totalCredit = credMap.get(ledger.id) || 0;

    let balance = Number(ledger.openingBalance);
    if (ledger.balanceType === 'DEBIT') {
      balance = balance + totalDebit - totalCredit;
    } else {
      balance = balance + totalCredit - totalDebit;
    }

    if (Math.abs(balance) > 0.01) {
      const item = {
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        groupName: ledger.group.name,
        amount: balance
      };

      if (ledger.group.groupType === 'ASSETS') {
        assets.push(item);
      } else if (ledger.group.groupType === 'LIABILITIES') {
        liabilities.push(item);
      } else {
        equity.push(item);
      }
    }
  }

  // Calculate P&L (net profit) as of Date
  const plResult = await getProfitLossData(end);
  if (plResult.netProfit !== 0) {
    equity.push({
      ledgerId: null,
      ledgerName: plResult.netProfit >= 0 ? 'Net Profit (Current Period)' : 'Net Loss (Current Period)',
      groupName: 'Equity',
      amount: Math.abs(plResult.netProfit),
      isLoss: plResult.netProfit < 0
    });
  }

  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);

  // For equity, if it's a loss, we should subtract it if it's stored as positive.
  // Actually, to balance: Assets = Liabilities + Equity
  // Let's adjust totalEquity calculation:
  const totalEquity = equity.reduce((sum, item) => {
    if (item.ledgerName.includes('Net Loss')) return sum - item.amount;
    return sum + item.amount;
  }, 0);

  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  res.json({
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced,
    difference: totalAssets - (totalLiabilities + totalEquity)
  });
});

// ==================== LEDGER STATEMENT ====================

exports.getLedgerStatement = asyncHandler(async (req, res) => {
  const { ledgerId, startDate, endDate } = req.query;

  if (!ledgerId) {
    res.status(400);
    throw new Error('Ledger ID is required');
  }

  const ledger = await prisma.ledger.findUnique({
    where: { id: parseInt(ledgerId) },
    include: { group: true }
  });

  if (!ledger) {
    res.status(404);
    throw new Error('Ledger not found');
  }

  // Check if this ledger corresponds to a Customer / Sundry Debtors
  const customer = await prisma.customer.findFirst({
    where: { name: ledger.name }
  });
  const isCustomerLedger = Boolean(customer || ledger.group?.name === 'Sundry Debtors');

  const start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);

  if (isCustomerLedger && customer) {
    // ----------------------------------------------------
    // CUSTOMER LEDGER STATEMENT LOGIC
    // ----------------------------------------------------
    let openingBalance = parseFloat(ledger.openingBalance || 0);

    const allCustomerSales = await prisma.sale.findMany({
      where: { customerId: customer.id, status: { not: 'cancelled' } },
      select: { invoiceNumber: true }
    });
    const customerInvoiceNumbers = allCustomerSales.map(s => s.invoiceNumber).filter(Boolean);

    if (start) {
      // Prior sales for this customer (saleDate before start)
      const priorSales = await prisma.sale.findMany({
        where: {
          customerId: customer.id,
          status: { not: 'cancelled' },
          saleDate: { lt: start }
        }
      });
      const priorSalesPending = priorSales.reduce((sum, s) => {
        const bal = parseFloat(s.balanceAmount !== undefined && s.balanceAmount !== null ? s.balanceAmount : (s.totalAmount - s.paidAmount));
        return sum + (bal > 0 ? bal : 0);
      }, 0);

      // Prior settlements / receipts from Payment table (strictly excluding initial sale payments)
      const priorPayments = await prisma.payment.findMany({
        where: {
          customerId: customer.id,
          type: 'receipt',
          saleId: null,
          reference: {
            notIn: [
              'Initial Payment',
              'Updated Payment',
              'Initial POS Payment',
              ...priorSales.map(s => s.invoiceNumber)
            ]
          },
          paymentDate: { lt: start }
        }
      });
      const priorSettled = priorPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // Prior Receipt Vouchers posted to this customer's ledger (via JournalEntry)
      const priorVoucherReceipts = await prisma.journalEntry.findMany({
        where: {
          creditLedgerId: ledger.id,
          voucher: {
            status: 'POSTED',
            voucherType: 'RECEIPT',
            date: { lt: start }
          }
        },
        include: { voucher: true }
      });
      const filteredPriorVoucherReceipts = priorVoucherReceipts.filter(e => {
        const ref = e.voucher?.reference;
        const narr = e.voucher?.narration || '';
        if (ref && customerInvoiceNumbers.includes(ref)) return false;
        if (narr.startsWith('Payment for #')) return false;
        return true;
      });
      const priorVoucherReceiptsTotal = filteredPriorVoucherReceipts.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      openingBalance += (priorSalesPending - priorSettled - priorVoucherReceiptsTotal);
    }

    // Fetch Period Sales (by saleDate)
    const periodSales = await prisma.sale.findMany({
      where: {
        customerId: customer.id,
        status: { not: 'cancelled' },
        ...(start || end ? {
          saleDate: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {})
          }
        } : {})
      },
      orderBy: { saleDate: 'asc' }
    });

    // Fetch Period Payments / Credit Settlements from Payment table (strictly excluding initial sale payments)
    const periodPayments = await prisma.payment.findMany({
      where: {
        customerId: customer.id,
        type: 'receipt',
        saleId: null,
        reference: {
          notIn: [
            'Initial Payment',
            'Updated Payment',
            'Initial POS Payment',
            ...periodSales.map(s => s.invoiceNumber)
          ]
        },
        ...(start || end ? {
          paymentDate: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {})
          }
        } : {})
      },
      orderBy: { paymentDate: 'asc' }
    });

    // Fetch Period Receipt Vouchers posted to this customer's ledger (via JournalEntry + Voucher)
    const periodVoucherReceipts = await prisma.journalEntry.findMany({
      where: {
        creditLedgerId: ledger.id,
        voucher: {
          status: 'POSTED',
          voucherType: 'RECEIPT',
          ...(start || end ? {
            date: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          } : {})
        }
      },
      include: {
        voucher: true,
        debitLedger: true
      },
      orderBy: { voucher: { date: 'asc' } }
    });

    const filteredPeriodVoucherReceipts = periodVoucherReceipts.filter(e => {
      const ref = e.voucher?.reference;
      const narr = e.voucher?.narration || '';
      if (ref && customerInvoiceNumbers.includes(ref)) return false;
      if (narr.startsWith('Payment for #')) return false;
      return true;
    });

    // Build statement rows for Customer
    const saleRows = periodSales.map(s => {
      const tot = parseFloat(s.totalAmount || 0);
      const paid = parseFloat(s.paidAmount || 0);
      const pending = parseFloat(s.balanceAmount !== undefined && s.balanceAmount !== null ? s.balanceAmount : (tot - paid));
      const finalPending = pending > 0 ? pending : 0;

      return {
        id: `sale-${s.id}`,
        date: s.saleDate,
        voucherNumber: s.invoiceNumber,
        voucherType: 'SALES',
        particulars: `Sales Invoice #${s.invoiceNumber}`,
        debit: finalPending, // DEBIT (OUT) = Pending / Credit Given to Customer
        credit: paid,        // CREDIT (IN) = Cash / Amount Received at Sale
        narration: s.description || (paid > 0 ? `Paid: ₹${paid}, Pending: ₹${finalPending}` : 'Full Credit Sale'),
        balanceImpact: finalPending
      };
    });

    // Payment table rows (credit settlements from creditController etc.)
    const paymentRows = periodPayments.map(p => {
      const amt = parseFloat(p.amount || 0);
      return {
        id: `pay-${p.id}`,
        date: p.paymentDate,
        voucherNumber: p.reference || `REC-${p.id}`,
        voucherType: 'RECEIPT',
        particulars: `${p.method || 'Cash'} Receipt (Credit Settlement)`,
        debit: 0,
        credit: amt, // CREDIT (IN) = Amount Received
        narration: p.description || 'Credit Settlement',
        balanceImpact: -amt
      };
    });

    // Receipt Voucher rows (from Voucher/JournalEntry – e.g. Receipt Voucher page)
    const voucherReceiptRows = filteredPeriodVoucherReceipts.map(e => {
      const amt = parseFloat(e.amount || 0);
      const debitLedgerName = e.debitLedger?.name || 'Cash';
      return {
        id: `vrec-${e.id}`,
        date: e.voucher.date,
        voucherNumber: e.voucher.voucherNumber,
        voucherType: 'RECEIPT',
        particulars: `${debitLedgerName} Receipt`,
        debit: 0,
        credit: amt, // CREDIT (IN) = Amount Received
        narration: e.voucher.narration || e.description || 'Receipt Voucher',
        balanceImpact: -amt
      };
    });

    const allRows = [...saleRows, ...paymentRows, ...voucherReceiptRows].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = openingBalance;
    const statement = allRows.map(row => {
      runningBalance += row.balanceImpact;
      return {
        ...row,
        balance: Math.abs(runningBalance) < 0.001 ? 0 : runningBalance
      };
    });

    return res.json({
      ledger: {
        id: ledger.id,
        name: ledger.name,
        groupName: ledger.group?.name || 'Sundry Debtors',
        openingBalance: openingBalance,
        balanceType: 'DEBIT',
        openingDebit: openingBalance > 0 ? openingBalance : 0,
        openingCredit: openingBalance < 0 ? Math.abs(openingBalance) : 0
      },
      statement,
      closingBalance: Math.abs(runningBalance) < 0.001 ? 0 : runningBalance
    });
  }

  // ----------------------------------------------------
  // STANDARD GENERAL LEDGER STATEMENT FOR OTHER ACCOUNTS
  // ----------------------------------------------------
  let calculatedOpeningBalance = parseFloat(ledger.openingBalance);
  let openingDebit = 0;
  let openingCredit = 0;

  if (start) {
    const preDebit = await prisma.journalEntry.aggregate({
      _sum: { amount: true },
      where: {
        debitLedgerId: parseInt(ledgerId),
        voucher: {
          status: 'POSTED',
          date: { lt: start }
        }
      }
    });

    const preCredit = await prisma.journalEntry.aggregate({
      _sum: { amount: true },
      where: {
        creditLedgerId: parseInt(ledgerId),
        voucher: {
          status: 'POSTED',
          date: { lt: start }
        }
      }
    });

    const totalPreDebitRaw = preDebit._sum.amount ? parseFloat(preDebit._sum.amount) : 0;
    const totalPreCreditRaw = preCredit._sum.amount ? parseFloat(preCredit._sum.amount) : 0;

    const masterOpening = parseFloat(ledger.openingBalance);
    if (ledger.balanceType === 'DEBIT') {
      calculatedOpeningBalance = masterOpening + totalPreDebitRaw - totalPreCreditRaw;
    } else {
      calculatedOpeningBalance = masterOpening + totalPreCreditRaw - totalPreDebitRaw;
    }

    openingDebit = totalPreDebitRaw + (ledger.balanceType === 'DEBIT' ? masterOpening : 0);
    openingCredit = totalPreCreditRaw + (ledger.balanceType === 'CREDIT' ? masterOpening : 0);
  } else {
    openingDebit = ledger.balanceType === 'DEBIT' ? parseFloat(ledger.openingBalance) : 0;
    openingCredit = ledger.balanceType === 'CREDIT' ? parseFloat(ledger.openingBalance) : 0;
  }

  const dateFilter = {};
  if (start || end) {
    dateFilter.date = {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {})
    };
  }

  const debitEntries = await prisma.journalEntry.findMany({
    where: {
      debitLedgerId: parseInt(ledgerId),
      voucher: {
        status: 'POSTED',
        ...dateFilter
      }
    },
    include: {
      voucher: true,
      creditLedger: true
    }
  });

  const creditEntries = await prisma.journalEntry.findMany({
    where: {
      creditLedgerId: parseInt(ledgerId),
      voucher: {
        status: 'POSTED',
        ...dateFilter
      }
    },
    include: {
      voucher: true,
      debitLedger: true
    }
  });

  const allEntriesRaw = [...debitEntries.map(e => ({ ...e, type: 'DEBIT' })), ...creditEntries.map(e => ({ ...e, type: 'CREDIT' }))];

  const entriesWithParticulars = await Promise.all(allEntriesRaw.map(async (e) => {
    let particulars = 'Multiple Accounts';

    const voucherEntries = await prisma.journalEntry.findMany({
      where: { voucherId: e.voucherId },
      include: { debitLedger: true, creditLedger: true }
    });

    const otherLedgers = voucherEntries
      .map(ve => ({
        id: ve.debitLedgerId || ve.creditLedgerId,
        name: ve.debitLedger?.name || ve.creditLedger?.name
      }))
      .filter(l => l.id !== parseInt(ledgerId));

    const uniqueOtherNames = [...new Set(otherLedgers.map(l => l.name))];

    if (uniqueOtherNames.length === 1) {
      particulars = uniqueOtherNames[0];
    } else if (uniqueOtherNames.length > 1) {
      particulars = `Multiple (${uniqueOtherNames.slice(0, 2).join(', ')}${uniqueOtherNames.length > 2 ? '...' : ''})`;
    } else {
      particulars = e.type === 'DEBIT' ? (e.creditLedger?.name || 'Related Ledger') : (e.debitLedger?.name || 'Related Ledger');
    }

    return {
      id: e.id,
      date: e.voucher.date,
      voucherNumber: e.voucher.voucherNumber,
      voucherType: e.voucher.voucherType,
      particulars: particulars,
      debit: e.type === 'DEBIT' ? parseFloat(e.amount) : 0,
      credit: e.type === 'CREDIT' ? parseFloat(e.amount) : 0,
      narration: e.voucher.narration
    };
  }));

  let allEntries = entriesWithParticulars.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = calculatedOpeningBalance;
  const statement = allEntries.map(entry => {
    if (ledger.balanceType === 'DEBIT') {
      runningBalance = runningBalance + entry.debit - entry.credit;
    } else {
      runningBalance = runningBalance + entry.credit - entry.debit;
    }

    return {
      ...entry,
      balance: Math.abs(runningBalance) < 0.001 ? 0 : runningBalance
    };
  });

  res.json({
    ledger: {
      id: ledger.id,
      name: ledger.name,
      groupName: ledger.group.name,
      openingBalance: calculatedOpeningBalance,
      balanceType: ledger.balanceType,
      openingDebit,
      openingCredit
    },
    statement,
    closingBalance: Math.abs(runningBalance) < 0.001 ? 0 : runningBalance
  });
});

// ==================== DAY BOOK ====================

exports.getDayBook = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    res.status(400);
    throw new Error('Date is required');
  }

  const selectedDate = new Date(date);
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const vouchers = await prisma.voucher.findMany({
    where: {
      date: {
        gte: selectedDate,
        lt: nextDate
      },
      status: 'POSTED'
    },
    include: {
      entries: {
        include: {
          debitLedger: true,
          creditLedger: true
        }
      }
    },
    orderBy: { voucherNumber: 'asc' }
  });

  const summary = vouchers.reduce((acc, v) => {
    acc[v.voucherType] = (acc[v.voucherType] || 0) + 1;
    return acc;
  }, {});

  res.json({
    date: selectedDate,
    vouchers,
    summary,
    totalVouchers: vouchers.length
  });
});

// ==================== HELPER FUNCTIONS ====================

async function getProfitLossData(endDate) {
  const end = endDate || new Date();

  const ledgers = await prisma.ledger.findMany({
    where: {
      isActive: true,
      group: { groupType: { in: ['INCOME', 'EXPENSES'] } }
    },
    include: { group: true }
  });

  const [debitSums, creditSums] = await Promise.all([
    prisma.journalEntry.groupBy({
      by: ['debitLedgerId'],
      _sum: { amount: true },
      where: {
        debitLedgerId: { in: ledgers.map(l => l.id) },
        voucher: { status: 'POSTED', date: { lte: end } }
      }
    }),
    prisma.journalEntry.groupBy({
      by: ['creditLedgerId'],
      _sum: { amount: true },
      where: {
        creditLedgerId: { in: ledgers.map(l => l.id) },
        voucher: { status: 'POSTED', date: { lte: end } }
      }
    })
  ]);

  const debMap = new Map(debitSums.map(s => [s.debitLedgerId, Number(s._sum.amount || 0)]));
  const credMap = new Map(creditSums.map(s => [s.creditLedgerId, Number(s._sum.amount || 0)]));

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const ledger of ledgers) {
    const totalDebit = debMap.get(ledger.id) || 0;
    const totalCredit = credMap.get(ledger.id) || 0;

    let balance = 0;
    if (ledger.balanceType === 'DEBIT') {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    if (ledger.group.groupType === 'INCOME') {
      totalIncome += balance;
    } else {
      totalExpenses += balance;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses
  };
}
