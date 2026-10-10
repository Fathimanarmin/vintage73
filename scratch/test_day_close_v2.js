const prisma = require('../backend/config/prisma');
const dayCloseController = require('../backend/controllers/dayCloseController');

async function testDayCloseV2() {
  console.log('=== Automatic Date Day Close Test ===');

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

    // 1. Get Status
    const statusRes = await callController(dayCloseController.getDayCloseStatus, {
      query: { branchId: branch.id },
      user: adminUser
    });
    console.log('✅ 1. getDayCloseStatus:', {
      success: statusRes.data?.success,
      currentDateDisplay: statusRes.data?.currentDateDisplay,
      activeDateDisplay: statusRes.data?.activeDateDisplay,
      activeDate: statusRes.data?.activeDate,
      status: statusRes.data?.status
    });

    const activeDateStr = statusRes.data?.activeDate;

    // 2. Confirm Day Close for the active date
    const confirmRes = await callController(dayCloseController.confirmDayClose, {
      body: { branchId: branch.id, businessDate: activeDateStr },
      user: adminUser
    });
    console.log('✅ 2. confirmDayClose:', {
      success: confirmRes.data?.success,
      message: confirmRes.data?.message,
      dayCloseStatus: confirmRes.data?.dayClose?.status
    });

    // 3. Duplicate Closing Test on same active date
    const duplicateRes = await callController(dayCloseController.confirmDayClose, {
      body: { branchId: branch.id, businessDate: activeDateStr },
      user: adminUser
    });
    if (duplicateRes.error && duplicateRes.error.includes('already been completed')) {
      console.log('✅ 3. Duplicate Protection PASSED:', duplicateRes.error);
    } else {
      console.error('❌ 3. Duplicate Protection FAILED:', duplicateRes);
    }

    // 4. Chronological Order Test: Insert sale on 2026-10-09 (unclosed) and attempt to close 2026-10-11
    const p9Utc = new Date(Date.UTC(2026, 9, 9));
    const saleP9 = await prisma.sale.create({
      data: {
        invoiceNumber: 'TEST-P9-999',
        branchId: branch.id,
        saleDate: p9Utc,
        subTotal: 100,
        taxAmount: 0,
        totalAmount: 100,
        paidAmount: 100,
        paymentMethod: 'cash',
        status: 'completed'
      }
    });

    // Attempt to close 2026-10-11 while 2026-10-09 is unclosed
    const chronoRes = await callController(dayCloseController.confirmDayClose, {
      body: { branchId: branch.id, businessDate: '2026-10-11' },
      user: adminUser
    });

    if (chronoRes.error && chronoRes.error.includes('Previous Day Close Pending')) {
      console.log('✅ 4. Chronological Order Test PASSED:', chronoRes.error);
    } else {
      console.error('❌ 4. Chronological Order Test FAILED:', chronoRes);
    }

    // Cleanup test entries
    await prisma.sale.delete({ where: { id: saleP9.id } });
    await prisma.dayClose.deleteMany({
      where: {
        branchId: branch.id,
        businessDate: { in: [new Date(Date.UTC(2026, 8, 15)), new Date(Date.UTC(2026, 9, 9)), new Date(Date.UTC(2026, 9, 11))] }
      }
    });
    console.log('✅ Cleaned up test database records');

  } catch (err) {
    console.error('❌ Integration test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testDayCloseV2();
