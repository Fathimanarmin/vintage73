const { PrismaClient } = require('./client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Chart of Accounts...');

    // 1. Define Standard Hierarchy
    const hierarchy = [
        {
            name: 'Assets',
            type: 'ASSETS',
            isSystem: true,
            children: [
                {
                    name: 'Cash-in-Hand',
                    type: 'ASSETS',
                    isSystem: true,
                    ledgers: ['Cash Account', 'Petty Cash']
                },
                {
                    name: 'Bank Accounts',
                    type: 'ASSETS',
                    isSystem: true,
                    ledgers: ['Bank Account']
                },
                {
                    name: 'Sundry Debtors',
                    type: 'ASSETS',
                    isSystem: true,
                    ledgers: ['Walk-in Customer']
                },
                {
                    name: 'Current Assets',
                    type: 'ASSETS',
                    isSystem: true,
                    ledgers: ['Stock-in-Hand']
                },
                {
                    name: 'Fixed Assets',
                    type: 'ASSETS',
                    isSystem: true,
                    ledgers: ['Furniture & Fixtures', 'Machinery & Equipment']
                }
            ]
        },
        {
            name: 'Liabilities',
            type: 'LIABILITIES',
            isSystem: true,
            children: [
                {
                    name: 'Duties & Taxes',
                    type: 'LIABILITIES',
                    isSystem: true,
                    ledgers: ['Output CGST', 'Output SGST', 'Output IGST', 'Input CGST', 'Input SGST', 'Input IGST', 'Tax Account']
                },
                {
                    name: 'Sundry Creditors',
                    type: 'LIABILITIES',
                    isSystem: true,
                    ledgers: []
                },
                {
                    name: 'Loans (Liability)',
                    type: 'LIABILITIES',
                    isSystem: true,
                    ledgers: ['Bank OD A/c', 'Secured Loans']
                }
            ]
        },
        {
            name: 'Income',
            type: 'INCOME',
            isSystem: true,
            children: [
                {
                    name: 'Sales Accounts',
                    type: 'INCOME',
                    isSystem: true,
                    ledgers: ['Sales Account']
                },
                {
                    name: 'Indirect Income',
                    type: 'INCOME',
                    isSystem: true,
                    ledgers: ['Discount Received', 'Interest Received']
                }
            ]
        },
        {
            name: 'Expenses',
            type: 'EXPENSES',
            isSystem: true,
            children: [
                {
                    name: 'Purchase Accounts',
                    type: 'EXPENSES',
                    isSystem: true,
                    ledgers: ['Purchase Account']
                },
                {
                    name: 'Direct Expenses',
                    type: 'EXPENSES',
                    isSystem: true,
                    ledgers: ['Wages', 'Freight Changes']
                },
                {
                    name: 'Indirect Expenses',
                    type: 'EXPENSES',
                    isSystem: true,
                    ledgers: ['Rent', 'Salaries', 'Electricity', 'Round Off']
                }
            ]
        },
        {
            name: 'Equity',
            type: 'EQUITY',
            isSystem: true,
            children: [
                {
                    name: 'Capital Account',
                    type: 'EQUITY',
                    isSystem: true,
                    ledgers: ['Owner\'s Capital', 'Drawings']
                }
            ]
        }
    ];

    for (const rootGroup of hierarchy) {
        // Create Root Group
        const root = await prisma.accountGroup.upsert({
            where: { name: rootGroup.name },
            update: {},
            create: {
                name: rootGroup.name,
                groupType: rootGroup.type,
                isSystem: rootGroup.isSystem
            }
        });

        console.log(`Created/Checked Root Group: ${root.name}`);

        if (rootGroup.children) {
            for (const childGroup of rootGroup.children) {
                // Create Child Group
                const child = await prisma.accountGroup.upsert({
                    where: { name: childGroup.name },
                    update: {},
                    create: {
                        name: childGroup.name,
                        groupType: childGroup.type,
                        isSystem: childGroup.isSystem,
                        parentId: root.id
                    }
                });

                console.log(`  - Group: ${child.name}`);

                if (childGroup.ledgers) {
                    for (const ledgerName of childGroup.ledgers) {
                        // Create Ledger
                        await prisma.ledger.upsert({
                            where: { name: ledgerName },
                            update: {},
                            create: {
                                name: ledgerName,
                                groupId: child.id,
                                balanceType: ['ASSETS', 'EXPENSES'].includes(rootGroup.type) ? 'DEBIT' : 'CREDIT',
                                isSystem: true // Mark as system ledger
                            }
                        });
                        console.log(`    - Ledger: ${ledgerName}`);
                    }
                }
            }
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
