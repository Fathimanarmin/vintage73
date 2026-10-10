const prisma = require('../backend/config/prisma');
const dayCloseController = require('../backend/controllers/dayCloseController');
const { getBranchActiveBusinessDate } = require('../backend/utils/businessDateHelper');
const salesController = require('../backend/controllers/salesController');

async function testDayCloseV4() {
  console.log('=== Business Date & Day Close Full Integration Test ===');

  try {
    const branch = await prisma.branch.findFirst();
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } }) || await prisma.user.findFirst();

    if (!branch || !adminUser) {
      console.log('Error: Could not find test branch or user');
      return;
    }

    console.log(`Test Branch ID: ${branch.id} (${branch.name})`);
    console.log(`Test Admin User: ${adminUser.username} (ID: ${adminUser.id})`);

    const callController = (fn, req) => {
      return new Promise((resolve) => {
        let statusCode = 200;
        let responseData = null;

        const res = {
          status: (code) => { statusCode = code; return res; },
          json: (data) => { responseData = data; resolve({ statusCode, data, error: null }); return res; }
        };

        const next = (err) => {
          if (err) {
            resolve({ statusCode: statusCode || 400, data: null, error: err.message || String(err) });
          } else {
            resolve({ statusCode, data: responseData, error: null });
          }
        };

        fn(req, res, next);
      });
    };

    // Step 1: Create an unclosed sale on 2026-10-09
    const p9Utc = new Date(Date.UTC(2026, 9, 9, 12, 0, 0));
    const saleP9 = await prisma.sale.create({
      data: {
        invoiceNumber: 'TEST-BIZ-09',
        branchId: branch.id,
        saleDate: p9Utc,
        subTotal: 500,
        taxAmount: 0,
        totalAmount: 500,
        paidAmount: 500,
        paymentMethod: 'cash',
        status: 'completed'
      }
    });

    console.log(`Created test sale on 2026-10-09 (ID: ${saleP9.id})`);

    // Step 2: Check active business date (should resolve to 2026-10-09)
    const activeDateBefore = await getBranchActiveBusinessDate(branch.id);
    console.log('✅ Active business date before closing:', activeDateBefore.dateStr);

    if (activeDateBefore.dateStr !== '2026-10-09') {
      console.error('❌ Expected active date 2026-10-09, got:', activeDateBefore.dateStr);
    } else {
      console.log('✅ Active business date correctly locked to 2026-10-09!');
    }

    // Step 3: Create a new sale without explicit saleDate on 2026-10-10
    const itemProduct = await prisma.product.findFirst();
    if (itemProduct) {
      const saleReq = {
        body: {
          branchId: branch.id,
          items: [{ productId: itemProduct.id, quantity: 1, unitPrice: 100 }],
          paymentMethod: 'cash',
          paidAmount: 100
        },
        user: adminUser
      };

      const newSaleRes = await callController(salesController.createSale, saleReq);
      if (newSaleRes.data && newSaleRes.data.sale) {
        const createdSaleDateStr = new Date(newSaleRes.data.sale.saleDate).toISOString().split('T')[0];
        console.log('✅ New sale created with saleDate:', createdSaleDateStr);

        if (createdSaleDateStr === '2026-10-09') {
          console.log('✅ PASSED: New sale automatically inherited active business date (2026-10-09)!');
        } else {
          console.error('❌ FAILED: New sale did not inherit active date. Got:', createdSaleDateStr);
        }

        // Cleanup created sale
        await prisma.saleItem.deleteMany({ where: { saleId: newSaleRes.data.sale.id } });
        await prisma.sale.delete({ where: { id: newSaleRes.data.sale.id } });
      }
    }

    // Step 4: Close 2026-10-09
    const closeRes = await callController(dayCloseController.confirmDayClose, {
      body: { branchId: branch.id, businessDate: '2026-10-09' },
      user: adminUser
    });
    console.log('✅ Closed 2026-10-09:', closeRes.data?.message);

    // Step 5: Check active business date after closing (should advance to today 2026-10-10)
    const activeDateAfter = await getBranchActiveBusinessDate(branch.id);
    console.log('✅ Active business date after closing:', activeDateAfter.dateStr);

    if (activeDateAfter.dateStr === '2026-10-10') {
      console.log('✅ PASSED: Active business date automatically advanced to 2026-10-10!');
    }

    // Cleanup test records
    await prisma.sale.delete({ where: { id: saleP9.id } });
    await prisma.dayClose.deleteMany({
      where: { branchId: branch.id, businessDate: new Date(Date.UTC(2026, 9, 9)) }
    });
    console.log('✅ Cleaned up all test records');

  } catch (err) {
    console.error('❌ Integration test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testDayCloseV4();
