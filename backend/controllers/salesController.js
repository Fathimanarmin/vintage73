const prisma = require('../config/prisma');
const asyncHandler = require('../middleware/asyncHandler');
const { processSalePosting } = require('../utils/accountingHelper');
const { generateNextNumber } = require('../services/numberingService');

// Create new sale
exports.createSale = asyncHandler(async (req, res) => {
  const { 
    customerId, items, paymentMethod, paidAmount, discount = 0, advanceRedeemed = 0, saleDate, salesmanId, 
    terminalId, isReturn = false, returnReason = '', originalInvoice = '',
    currencyCode = 'INR', exchangeRate = 1.0, description
  } = req.body;
  let { branchId } = req.body;

  if (!branchId && req.user && req.user.branchId) {
    branchId = req.user.branchId;
  }

  if (!branchId) {
    res.status(400);
    throw new Error('Branch selection is required.');
  }

  const validBranchId = parseInt(branchId);
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Sale must have at least one item.');
  }

  // Verify Branch
  const branchExists = await prisma.branch.findUnique({ where: { id: validBranchId } });
  if (!branchExists) {
    res.status(404);
    throw new Error(`Branch with ID ${validBranchId} not found.`);
  }

  // Verify Customer
  let customer = null;
  if (customerId) {
    customer = await prisma.customer.findUnique({ where: { id: parseInt(customerId) } });
  }

  // --- RETURN VALIDATION ---
  if (isReturn && originalInvoice) {
    const originalSale = await prisma.sale.findFirst({
      where: { invoiceNumber: originalInvoice },
      include: { items: true }
    });

    if (!originalSale) {
      res.status(404);
      throw new Error('Original invoice not found for return.');
    }

    const previousReturns = await prisma.sale.findMany({
      where: { originalInvoice, isReturn: true, status: { not: 'cancelled' } },
      include: { items: true }
    });

    const returnedQtyMap = {};
    previousReturns.forEach(ret => {
      ret.items.forEach(item => {
        returnedQtyMap[item.productId] = (returnedQtyMap[item.productId] || 0) + item.quantity;
      });
    });

    for (const item of items) {
      const originalItem = originalSale.items.find(i => i.productId === parseInt(item.productId));
      if (!originalItem) {
        res.status(400);
        throw new Error(`Product ${item.productId} was not part of original invoice.`);
      }
      const alreadyReturned = returnedQtyMap[item.productId] || 0;
      const remaining = originalItem.quantity - alreadyReturned;
      if (parseInt(item.quantity) > remaining) {
        res.status(400);
        throw new Error(`Cannot return ${item.quantity} units. Only ${remaining} remaining.`);
      }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const fetchBranch = await tx.branch.findUnique({ where: { id: validBranchId } });
    // 1. Calculate Totals (Hardened Validation)
    // Strictly only true/ "true" enables stock validation. Null/False/Falsy disabled it.
    const stockIncluded = fetchBranch?.stockIncluded === true || fetchBranch?.stockIncluded === 'true';
    
    console.log(`[POS Stock Resolution] Branch: ${validBranchId}, Raw: ${fetchBranch?.stockIncluded}, Final Decision: ${stockIncluded ? 'VALIDATING' : 'SKIPPING STOCK CHECK'}`);

    // 1. Calculate Totals
    let subTotal = 0;
    let taxAmount = 0;
    let totalItemsDiscount = 0;
    const saleItemsData = [];

    for (const item of items) {
      const productId = parseInt(item.productId);
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error(`Product ${productId} not found.`);

      // Zero-stock variant check (CRITICAL: A variant with stock <= 0 must never be saleable, regardless of branch settings)
      const selectedSize = item.size || item.selectedSize;
      if (!isReturn && selectedSize && product.sizeStocks) {
        let parsedSizeStocks = product.sizeStocks;
        if (typeof parsedSizeStocks === 'string') {
          try { parsedSizeStocks = JSON.parse(parsedSizeStocks); } catch (e) { parsedSizeStocks = []; }
        }
        if (Array.isArray(parsedSizeStocks)) {
          const sizeEntry = parsedSizeStocks.find(s => String(s.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase());
          if (sizeEntry) {
            const vStock = parseInt(sizeEntry.stock, 10) || 0;
            if (vStock <= 0) {
              throw new Error(`Size "${selectedSize}" for product "${product.name}" is out of stock (Stock: 0) and cannot be sold.`);
            }
          }
        }
      }

      // Stock Check for non-zero stock / branch stock
      if (!isReturn && stockIncluded) {
        const stock = await tx.productStock.findUnique({
          where: { branchId_productId: { branchId: validBranchId, productId } }
        });
        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}.`);
        }

        // Size-level stock check
        if (selectedSize && product.sizeStocks) {
          let parsedSizeStocks = product.sizeStocks;
          if (typeof parsedSizeStocks === 'string') {
            try { parsedSizeStocks = JSON.parse(parsedSizeStocks); } catch (e) { parsedSizeStocks = []; }
          }
          if (Array.isArray(parsedSizeStocks)) {
            const sizeEntry = parsedSizeStocks.find(s => String(s.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase());
            if (sizeEntry && (parseInt(sizeEntry.stock, 10) || 0) < item.quantity) {
              throw new Error(`Insufficient stock for ${product.name} (Size: ${selectedSize}). Available: ${sizeEntry.stock || 0}`);
            }
          }
        }
      }

      const unitPrice = parseFloat(item.unitPrice || item.price || 0);
      const discAmt = parseFloat(item.discountAmount || 0);
      const netPrice = unitPrice - discAmt;
      
      const taxRate = item.taxPercent !== undefined ? parseFloat(item.taxPercent) : parseFloat(product.taxRate || 0);
      const itemIsTaxInclusive = item.isTaxInclusive === true || item.isTaxInclusive === 'true';
      const lineTotalPayable = item.quantity * netPrice;
      
      let lineTax = 0;
      let lineTotal = 0;

      if (itemIsTaxInclusive && taxRate > 0) {
        const baseAmount = lineTotalPayable / (1 + (taxRate / 100));
        lineTax = lineTotalPayable - baseAmount;
        lineTotal = baseAmount;
      } else if (taxRate > 0) {
        lineTotal = lineTotalPayable;
        lineTax = (lineTotalPayable * taxRate) / 100;
      } else {
        lineTotal = lineTotalPayable;
        lineTax = 0;
      }

      subTotal += lineTotal;
      taxAmount += lineTax;
      totalItemsDiscount += (discAmt * item.quantity);

      saleItemsData.push({
        productId: parseInt(item.productId),
        size: item.size || item.selectedSize || null,
        quantity: parseFloat(item.quantity || 1),
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        discountPercent: parseFloat(item.discountPercent || 0),
        discountAmount: parseFloat(discAmt.toFixed(2)),
        total: parseFloat((lineTotal + lineTax).toFixed(2)),
        taxRate: parseFloat(taxRate.toFixed(2)),
        taxAmount: parseFloat(lineTax.toFixed(2)),
        isTaxInclusive: itemIsTaxInclusive
      });
    }

    const finalSubTotal = Number(subTotal.toFixed(2));
    const finalTaxAmount = Number(taxAmount.toFixed(2));
    const finalDiscount = Math.max(parseFloat(discount || 0), totalItemsDiscount);
    const finalRoundOffAmount = parseFloat(req.body.roundOffAmount || 0);

    const reqAdvanceUsed = parseFloat(advanceRedeemed || 0);

    // Explicit Calculation Logic: Total = Subtotal + Tax + RoundOff (Gross)
    const grandTotal = finalSubTotal + finalTaxAmount + finalRoundOffAmount;
    const finalGrandTotal = Number(grandTotal.toFixed(2));

    if (finalGrandTotal < 0) {
      throw new Error('Total Amount cannot be negative. Check advance or discounts.');
    }

    // Invoice Numbering
    const { number: genInvNo, nextSeq, financialYearId } = await generateNextNumber(tx, 'invoice', validBranchId, saleDate);
    if (financialYearId) {
      await tx.financialYear.update({ where: { id: financialYearId }, data: { invoiceSequence: nextSeq } });
    }

    if (reqAdvanceUsed > 0 && customer?.id) {
       // Validate against customer advance
       const advance = await tx.advance.findUnique({
          where: { customerId: customer.id }
       });
       
       const totalAvailable = Number(advance?.balance || 0);
       if (totalAvailable < reqAdvanceUsed) {
          throw new Error(`Insufficient advance balance. Available: ${totalAvailable}`);
       }
       
       // Update the single advance row
       const updatedAdvance = await tx.advance.update({
          where: { id: advance.id },
          data: {
            usedAmount: { increment: reqAdvanceUsed },
            balance: { decrement: reqAdvanceUsed }
          }
       });

       // Create History record
       await tx.advanceHistory.create({
          data: {
             customerId: customer.id,
             advanceId: advance.id,
             action: 'REDEEM',
             amount: reqAdvanceUsed,
             balanceAfter: Number(updatedAdvance.balance),
             reference: `Redeemed in Invoice #${genInvNo}`
          }
       });
    }

    const finalPaidAmount = parseFloat(paidAmount || 0);

    // Incentive
    let incentiveAmount = 0;
    if (salesmanId) {
      const salesman = await tx.user.findUnique({ where: { id: parseInt(salesmanId) } });
      if (salesman?.incentivePercentage > 0) {
        incentiveAmount = (finalGrandTotal * parseFloat(salesman.incentivePercentage)) / 100;
      }
    }

    const sale = await tx.sale.create({
      data: {
        invoiceNumber: genInvNo,
        customerId: customer?.id || null,
        paymentMethod,
        discount: finalDiscount,
        subTotal: finalSubTotal,
        taxAmount: finalTaxAmount,
        totalAmount: finalGrandTotal,
        roundOffAmount: finalRoundOffAmount,
        advanceUsed: reqAdvanceUsed,
        paidAmount: finalPaidAmount,
        balanceAmount: finalGrandTotal - finalPaidAmount - reqAdvanceUsed,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        branchId: validBranchId,
        salesmanId: salesmanId ? parseInt(salesmanId) : null,
        terminalId: terminalId ? parseInt(terminalId) : null,
        incentiveAmount,
        status: (finalGrandTotal - finalPaidAmount - reqAdvanceUsed) > 0.5 ? 'partial' : 'completed',
        financialYearId,
        isInvoice: !isReturn,
        isReturn,
        returnReason,
        originalInvoice,
        currencyCode,
        exchangeRate: parseFloat(exchangeRate),
        description,
        items: { create: saleItemsData }
      },
      include: { 
        customer: true, 
        items: { include: { product: true } }, 
        salesman: { select: { name: true } },
        branch: true
      }
    });

    // Accounting
    try {
      await processSalePosting(tx, sale, req.user?.id || 1);
    } catch (e) {
      console.error("Accounting error:", e);
      throw new Error('Accounting Integration Failed: ' + e.message);
    }

    // Stock & Payments
    for (const item of items) {
      await tx.productStock.upsert({
        where: { branchId_productId: { branchId: validBranchId, productId: parseInt(item.productId) } },
        create: { branchId: validBranchId, productId: parseInt(item.productId), quantity: isReturn ? item.quantity : -item.quantity },
        update: { quantity: isReturn ? { increment: item.quantity } : { decrement: item.quantity } }
      });

      // Deduct size-level stock if product has sizeStocks
      const selectedSize = item.size || item.selectedSize;
      if (selectedSize) {
        const prod = await tx.product.findUnique({ where: { id: parseInt(item.productId) } });
        if (prod && prod.sizeStocks) {
          let pSizeStocks = prod.sizeStocks;
          if (typeof pSizeStocks === 'string') {
            try { pSizeStocks = JSON.parse(pSizeStocks); } catch (e) { pSizeStocks = []; }
          }
          if (Array.isArray(pSizeStocks)) {
            const updatedSizeStocks = pSizeStocks.map(s => {
              if (String(s.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase()) {
                const cur = parseInt(s.stock, 10) || 0;
                const newStock = isReturn ? (cur + item.quantity) : (cur - item.quantity);
                return { ...s, stock: Math.max(0, newStock) };
              }
              return s;
            });
            await tx.product.update({
              where: { id: prod.id },
              data: { sizeStocks: updatedSizeStocks }
            });
          }
        }
      }
    }

    const paymentsList = req.body.payments || (finalPaidAmount > 0 ? [{ method: paymentMethod, amount: finalPaidAmount }] : []);
    for (const p of paymentsList) {
      if (p.amount > 0) {
        await tx.payment.create({
          data: {
            type: 'receipt', amount: parseFloat(p.amount), method: p.method,
            reference: 'Initial Payment', description: `Payment for Invoice ${sale.invoiceNumber}`,
            saleId: sale.id, branchId: validBranchId, customerId: customer?.id || null
          }
        });
      }
    }

    return sale;
  });

  res.status(201).json(result);
});

exports.getAllSales = asyncHandler(async (req, res) => {
  const { branchId, startDate, endDate, terminalId, invoice, isInvoice } = req.query;
  const where = {};
  if (isInvoice !== undefined) where.isInvoice = isInvoice === 'true';
  if (req.user.branchId) { where.branchId = req.user.branchId; } 
  else if (branchId) { where.branchId = parseInt(branchId); }
  if (terminalId) where.terminalId = parseInt(terminalId);
  if (invoice) where.invoiceNumber = invoice;
  if (startDate && endDate) {
    where.saleDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      customer: true,
      items: { include: { product: true } },
      salesman: { select: { name: true } },
      branch: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const normalized = sales.map(s => ({
    ...s,
    discount: Number(s.discount || 0),
    advanceUsed: Number(s.advanceUsed || 0),
    customerName: s.customer?.name || s.customerName || 'Walk-in Customer'
  }));

  res.json(normalized);
});

exports.cancelSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancelledBy, cancelReason } = req.body;
  const sale = await prisma.sale.findUnique({ where: { id: parseInt(id) }, include: { items: true } });
  if (!sale || sale.status === 'cancelled') throw new Error('Invalid sale or already cancelled');

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: parseInt(id) },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledBy, cancelReason, balanceAmount: 0 }
    });
    for (const item of sale.items) {
      await tx.productStock.update({
        where: { branchId_productId: { branchId: sale.branchId, productId: item.productId } },
        data: { quantity: { increment: item.quantity } }
      });

      // Restore size stock if item has size
      if (item.size) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (prod && prod.sizeStocks) {
          let pSizeStocks = prod.sizeStocks;
          if (typeof pSizeStocks === 'string') {
            try { pSizeStocks = JSON.parse(pSizeStocks); } catch (e) { pSizeStocks = []; }
          }
          if (Array.isArray(pSizeStocks)) {
            const updatedSizeStocks = pSizeStocks.map(s => {
              if (String(s.size).trim().toLowerCase() === String(item.size).trim().toLowerCase()) {
                const cur = parseInt(s.stock, 10) || 0;
                return { ...s, stock: cur + item.quantity };
              }
              return s;
            });
            await tx.product.update({
              where: { id: prod.id },
              data: { sizeStocks: updatedSizeStocks }
            });
          }
        }
      }
    }
    await tx.payment.deleteMany({ where: { saleId: parseInt(id) } });
    await tx.voucher.updateMany({ where: { reference: sale.invoiceNumber }, data: { status: 'CANCELLED' } });
  });
  res.json({ message: 'Success' });
});

exports.updateSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    customerId, items, paymentMethod, paidAmount, discount = 0, saleDate, salesmanId, 
    terminalId, currencyCode = 'INR', exchangeRate = 1.0, advanceRedeemed = 0, description
  } = req.body;
  let branchId = req.body.branchId || req.user?.branchId;

  const validSaleId = parseInt(id);
  const existing = await prisma.sale.findUnique({ where: { id: validSaleId }, include: { items: true } });
  if (!existing) throw new Error('Sale not found');

  const result = await prisma.$transaction(async (tx) => {
    // Reverse old stock
    for (const item of existing.items) {
      await tx.productStock.upsert({
        where: { branchId_productId: { branchId: existing.branchId, productId: item.productId } },
        create: { branchId: existing.branchId, productId: item.productId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } }
      });

      // Restore size stock
      if (item.size) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (prod && prod.sizeStocks) {
          let pSizeStocks = prod.sizeStocks;
          if (typeof pSizeStocks === 'string') {
            try { pSizeStocks = JSON.parse(pSizeStocks); } catch (e) { pSizeStocks = []; }
          }
          if (Array.isArray(pSizeStocks)) {
            const updatedSizeStocks = pSizeStocks.map(s => {
              if (String(s.size).trim().toLowerCase() === String(item.size).trim().toLowerCase()) {
                const cur = parseInt(s.stock, 10) || 0;
                return { ...s, stock: cur + item.quantity };
              }
              return s;
            });
            await tx.product.update({
              where: { id: prod.id },
              data: { sizeStocks: updatedSizeStocks }
            });
          }
        }
      }
    }

    // --- ADVANCE REVERSAL (IF ANY) ---
    if (existing.advanceUsed > 0 && existing.customerId) {
        const adv = await tx.advance.findUnique({ where: { customerId: existing.customerId } });
        if (adv) {
            await tx.advance.update({
                where: { id: adv.id },
                data: {
                    usedAmount: { decrement: existing.advanceUsed },
                    balance: { increment: existing.advanceUsed }
                }
            });
            await tx.advanceHistory.create({
                data: {
                    customerId: existing.customerId,
                    advanceId: adv.id,
                    action: 'ADD',
                    amount: existing.advanceUsed,
                    balanceAfter: Number(adv.balance) + Number(existing.advanceUsed),
                    reference: `Reversal from Updated/Voided Invoice #${existing.invoiceNumber}`
                }
            });
        }
    }

    await tx.saleItem.deleteMany({ where: { saleId: validSaleId } });
    await tx.payment.deleteMany({ where: { saleId: validSaleId } });
    await tx.voucher.updateMany({ where: { reference: existing.invoiceNumber }, data: { status: 'CANCELLED' } });

    const fetchBranch = await tx.branch.findUnique({ where: { id: existing.branchId } });
    // Robust check for stockIncluded (Hardened)
    const stockIncluded = fetchBranch?.stockIncluded === true || fetchBranch?.stockIncluded === 'true';

    console.log(`[POS Stock Resolution:Update] Branch: ${existing.branchId}, Raw: ${fetchBranch?.stockIncluded}, Final Decision: ${stockIncluded ? 'VALIDATING' : 'SKIPPING STOCK CHECK'}`);

    // Recalculate
    let subTotal = 0;
    let taxAmount = 0;
    let totalItemsDiscount = 0;
    const saleItemsData = [];

    for (const item of items) {
      const productId = parseInt(item.productId);
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error(`Product ${productId} not found.`);

      // Zero-stock variant check (CRITICAL: A variant with stock <= 0 must never be saleable, regardless of branch settings)
      const selectedSize = item.size || item.selectedSize;
      if (selectedSize && product.sizeStocks) {
        let parsedSizeStocks = product.sizeStocks;
        if (typeof parsedSizeStocks === 'string') {
          try { parsedSizeStocks = JSON.parse(parsedSizeStocks); } catch (e) { parsedSizeStocks = []; }
        }
        if (Array.isArray(parsedSizeStocks)) {
          const sizeEntry = parsedSizeStocks.find(s => String(s.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase());
          if (sizeEntry) {
            const vStock = parseInt(sizeEntry.stock, 10) || 0;
            if (vStock <= 0) {
              throw new Error(`Size "${selectedSize}" for product "${product.name}" is out of stock (Stock: 0) and cannot be sold.`);
            }
          }
        }
      }

      // Stock Check for non-zero stock / branch stock
      if (stockIncluded) {
        const stock = await tx.productStock.findUnique({
          where: { branchId_productId: { branchId: existing.branchId, productId } }
        });
        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${stock?.quantity || 0}`);
        }

        // Size-level stock check
        if (selectedSize && product.sizeStocks) {
          let parsedSizeStocks = product.sizeStocks;
          if (typeof parsedSizeStocks === 'string') {
            try { parsedSizeStocks = JSON.parse(parsedSizeStocks); } catch (e) { parsedSizeStocks = []; }
          }
          if (Array.isArray(parsedSizeStocks)) {
            const sizeEntry = parsedSizeStocks.find(s => String(s.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase());
            if (sizeEntry && (parseInt(sizeEntry.stock, 10) || 0) < item.quantity) {
              throw new Error(`Insufficient stock for ${product.name} (Size: ${selectedSize}). Available: ${sizeEntry.stock || 0}`);
            }
          }
        }
      }

      const unitPrice = parseFloat(item.unitPrice || item.price || 0);
      const discAmt = parseFloat(item.discountAmount || 0);
      const netPrice = unitPrice - discAmt;
      const taxRate = item.taxPercent !== undefined ? parseFloat(item.taxPercent) : parseFloat(product.taxRate || 0);
      
      // FORCE EXCLUSIVE FOR POS TAX (to ensure Total = Subtotal + Tax as per user req)
      const isTaxInclusive = false;

      let lineTax = 0;
      let lineTotal = 0; // Exclusive

      if (taxRate > 0) {
        lineTotal = item.quantity * netPrice;
        lineTax = (lineTotal * taxRate) / 100;
      } else {
        lineTotal = item.quantity * netPrice;
        lineTax = 0;
      }

      subTotal += lineTotal;
      taxAmount += lineTax;
      totalItemsDiscount += (discAmt * item.quantity);

      saleItemsData.push({
        productId: parseInt(item.productId),
        size: item.size || item.selectedSize || null,
        quantity: parseFloat(item.quantity || 1),
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        discountPercent: parseFloat(item.discountPercent || 0),
        discountAmount: parseFloat(discAmt.toFixed(2)),
        total: parseFloat((lineTotal + lineTax).toFixed(2)),
        taxAmount: parseFloat(lineTax.toFixed(2)),
        taxRate
      });
    }

    const finalSubTotal = Number(subTotal.toFixed(2));
    const finalTaxAmount = Number(taxAmount.toFixed(2));
    const finalDiscount = Math.max(parseFloat(discount || 0), totalItemsDiscount); // Still needed for display/record
    const finalRoundOffAmount = parseFloat(req.body.roundOffAmount || 0);
    // Explicit Calculation Logic: Total = Subtotal + Tax + RoundOff
    const grandTotal = finalSubTotal + finalTaxAmount + finalRoundOffAmount;
    const finalGrandTotal = Number(grandTotal.toFixed(2));
    const finalPaidAmount = parseFloat(paidAmount || 0);

    const updated = await tx.sale.update({
      where: { id: validSaleId },
      data: {
        customerId: customerId ? parseInt(customerId) : null,
        paymentMethod,
        discount: finalDiscount,
        subTotal: finalSubTotal,
        taxAmount: finalTaxAmount,
        totalAmount: finalGrandTotal,
        roundOffAmount: finalRoundOffAmount,
        paidAmount: finalPaidAmount,
        advanceUsed: parseFloat(advanceRedeemed || 0),
        balanceAmount: finalGrandTotal - finalPaidAmount - parseFloat(advanceRedeemed || 0),
        description,
        status: (finalGrandTotal - finalPaidAmount - parseFloat(advanceRedeemed || 0)) > 0.5 ? 'partial' : 'completed',
        items: { create: saleItemsData }
      },
      include: { 
        customer: true, 
        items: { include: { product: true } },
        salesman: { select: { name: true } },
        branch: true
      }
    });

    // --- NEW ADVANCE DEDUCTION (IF ANY) ---
    const reqAdvanceUsed = parseFloat(advanceRedeemed || 0);
    if (reqAdvanceUsed > 0 && customerId) {
        const adv = await tx.advance.findUnique({ where: { customerId: parseInt(customerId) } });
        const totalAvail = Number(adv?.balance || 0);
        if (totalAvail < reqAdvanceUsed) throw new Error(`Insufficient advance balance. Available: ${totalAvail}`);

        const updatedAdv = await tx.advance.update({
            where: { id: adv.id },
            data: {
                usedAmount: { increment: reqAdvanceUsed },
                balance: { decrement: reqAdvanceUsed }
            }
        });
        await tx.advanceHistory.create({
            data: {
                customerId: parseInt(customerId),
                advanceId: adv.id,
                action: 'REDEEM',
                amount: reqAdvanceUsed,
                balanceAfter: Number(updatedAdv.balance),
                reference: `Redeemed in Invoice #${updated.invoiceNumber} (Update)`
            }
        });
    }

    await processSalePosting(tx, updated, req.user?.id || 1);

    for (const item of items) {
      await tx.productStock.upsert({
        where: { branchId_productId: { branchId: updated.branchId, productId: parseInt(item.productId) } },
        create: { branchId: updated.branchId, productId: parseInt(item.productId), quantity: -item.quantity },
        update: { quantity: { decrement: item.quantity } }
      });

      // Deduct size-level stock if product has sizeStocks
      const selectedSize = item.size || item.selectedSize;
      if (selectedSize) {
        const prod = await tx.product.findUnique({ where: { id: parseInt(item.productId) } });
        if (prod && prod.sizeStocks) {
          let pSizeStocks = prod.sizeStocks;
          if (typeof pSizeStocks === 'string') {
            try { pSizeStocks = JSON.parse(pSizeStocks); } catch (e) { pSizeStocks = []; }
          }
          if (Array.isArray(pSizeStocks)) {
            const updatedSizeStocks = pSizeStocks.map(s => {
              if (String(s.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase()) {
                const cur = parseInt(s.stock, 10) || 0;
                return { ...s, stock: Math.max(0, cur - item.quantity) };
              }
              return s;
            });
            await tx.product.update({
              where: { id: prod.id },
              data: { sizeStocks: updatedSizeStocks }
            });
          }
        }
      }
    }

    const paymentsList = req.body.payments || (finalPaidAmount > 0 ? [{ method: paymentMethod, amount: finalPaidAmount }] : []);
    for (const p of paymentsList) {
      if (p.amount > 0) {
        await tx.payment.create({
          data: {
            type: 'receipt', amount: parseFloat(p.amount), method: p.method,
            reference: 'Updated Payment', description: `Payment for Invoice ${updated.invoiceNumber}`,
            saleId: validSaleId, branchId: updated.branchId
          }
        });
      }
    }
    return updated;
  });

  res.json(result);
});
