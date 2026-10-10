const prisma = require('../backend/config/prisma');
const dayCloseController = require('../backend/controllers/dayCloseController');

async function testDayCloseV3() {
  console.log('=== Day Close Date Picker & Login Warning Verification ===');

  try {
    const branch = await prisma.branch.findFirst();
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } }) || await prisma.user.findFirst();

    if (!branch || !adminUser) {
      console.log('Error: Could not find test branch or user');
      return;
    }

    console.log(`Test Branch ID: ${branch.id} (${branch.name})`);
    console.log(`Test User: ${adminUser.username} (ID: ${adminUser.id})`);

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

    // 1. Test status for today
    const statusRes = await callController(dayCloseController.getDayCloseStatus, {
      query: { branchId: branch.id, date: '2026-10-10' },
      user: adminUser
    });
    console.log('✅ 1. getDayCloseStatus for 10/10/2026:', {
      success: statusRes.data?.success,
      selectedDateDisplay: statusRes.data?.selectedDateDisplay,
      status: statusRes.data?.status
    });

    // 2. Test future date blocking
    const futureRes = await callController(dayCloseController.confirmDayClose, {
      body: { branchId: branch.id, businessDate: '2026-10-15' },
      user: adminUser
    });
    if (futureRes.error && futureRes.error.includes('Future dates cannot be closed')) {
      console.log('✅ 2. Future Date Blocking PASSED:', futureRes.error);
    } else {
      console.error('❌ 2. Future Date Blocking FAILED:', futureRes);
    }

    // 3. Confirm Day Close for 2026-10-10
    const confirmRes = await callController(dayCloseController.confirmDayClose, {
      body: { branchId: branch.id, businessDate: '2026-10-10' },
      user: adminUser
    });
    console.log('✅ 3. confirmDayClose for 10/10/2026:', {
      success: confirmRes.data?.success,
      message: confirmRes.data?.message
    });

    // 4. Duplicate closing attempt
    const duplicateRes = await callController(dayCloseController.confirmDayClose, {
      body: { branchId: branch.id, businessDate: '2026-10-10' },
      user: adminUser
    });
    if (duplicateRes.error && duplicateRes.error.includes('already been completed')) {
      console.log('✅ 4. Duplicate Closing Protection PASSED:', duplicateRes.error);
    } else {
      console.error('❌ 4. Duplicate Closing Protection FAILED:', duplicateRes);
    }

    // 5. Test login unclosed warning API
    const unclosedCheckRes = await callController(dayCloseController.checkUnclosed, {
      query: { branchId: branch.id },
      user: adminUser
    });
    console.log('✅ 5. checkUnclosed (login warning check):', unclosedCheckRes.data);

    // Cleanup test entries
    await prisma.dayClose.deleteMany({
      where: {
        branchId: branch.id,
        businessDate: new Date(Date.UTC(2026, 9, 10))
      }
    });
    console.log('✅ Cleaned up test records');

  } catch (err) {
    console.error('❌ Integration test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testDayCloseV3();
