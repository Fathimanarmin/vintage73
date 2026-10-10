const prisma = require('../backend/config/prisma');
const dayCloseController = require('../backend/controllers/dayCloseController');

async function testDayClose() {
  console.log('=== Day Close Integration Test ===');

  try {
    const branch = await prisma.branch.findFirst();
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } }) || await prisma.user.findFirst();

    if (!branch || !adminUser) {
      console.log('Error: Could not find test branch or user');
      return;
    }

    console.log(`Test Branch ID: ${branch.id} (${branch.name})`);
    console.log(`Test Admin User: ${adminUser.username} (ID: ${adminUser.id})`);

    const testDate = '2026-10-10';

    const callController = async (fn, req) => {
      let statusCode = 200;
      let responseData = null;
      let errorMessage = null;

      const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { responseData = data; return res; }
      };

      const next = (err) => {
        if (err) {
          errorMessage = err.message || String(err);
        }
      };

      await fn(req, res, next);
      return { statusCode, data: responseData, error: errorMessage };
    };

    // 1. Get Summary
    const summaryRes = await callController(dayCloseController.getDayCloseSummary, {
      query: { branchId: branch.id, date: testDate },
      user: adminUser
    });
    console.log('✅ 1. getDayCloseSummary:', {
      statusCode: summaryRes.statusCode,
      success: summaryRes.data?.success,
      status: summaryRes.data?.status,
      netCashInHand: summaryRes.data?.summary?.netCashInHand
    });

    // 2. Check Unclosed
    const unclosedRes = await callController(dayCloseController.checkUnclosed, {
      query: { branchId: branch.id },
      user: adminUser
    });
    console.log('✅ 2. checkUnclosed:', unclosedRes.data);

    // 3. Staff Submit
    const staffSubmitRes = await callController(dayCloseController.submitStaffDayClose, {
      body: {
        branchId: branch.id,
        businessDate: testDate,
        physicalCash: 550,
        denomination: { 500: 1, 50: 1 },
        notes: 'Test staff closing submission'
      },
      user: adminUser
    });
    console.log('✅ 3. submitStaffDayClose:', {
      statusCode: staffSubmitRes.statusCode,
      success: staffSubmitRes.data?.success,
      dayCloseStatus: staffSubmitRes.data?.dayClose?.status,
      physicalCash: staffSubmitRes.data?.staffClose?.physicalCash
    });

    // 4. Admin Finalize
    const adminFinalizeRes = await callController(dayCloseController.finalizeAdminDayClose, {
      body: {
        branchId: branch.id,
        businessDate: testDate,
        notes: 'Test admin finalization'
      },
      user: adminUser
    });
    console.log('✅ 4. finalizeAdminDayClose:', {
      statusCode: adminFinalizeRes.statusCode,
      success: adminFinalizeRes.data?.success,
      dayCloseStatus: adminFinalizeRes.data?.dayClose?.status
    });

    // 5. Lock Protection Test (Attempt staff submit after admin close)
    const lockTestRes = await callController(dayCloseController.submitStaffDayClose, {
      body: {
        branchId: branch.id,
        businessDate: testDate,
        physicalCash: 600,
        notes: 'Attempt staff submit after admin close'
      },
      user: adminUser
    });

    if (lockTestRes.error && lockTestRes.error.includes('locked')) {
      console.log('✅ 5. Lock Protection Test PASSED:', lockTestRes.error);
    } else {
      console.error('❌ 5. Lock Protection Test FAILED:', lockTestRes);
    }

    // Cleanup test entries
    await prisma.staffDayClose.deleteMany({
      where: { dayClose: { branchId: branch.id, businessDate: new Date(Date.UTC(2026, 9, 10)) } }
    });
    await prisma.dayClose.deleteMany({
      where: { branchId: branch.id, businessDate: new Date(Date.UTC(2026, 9, 10)) }
    });
    console.log('✅ Cleaned up test database records');

  } catch (err) {
    console.error('❌ Integration test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testDayClose();
