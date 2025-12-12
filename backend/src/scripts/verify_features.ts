
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// const connectionString = `${process.env.DATABASE_URL}`;
// const pool = new Pool({ connectionString });
// const adapter = new PrismaPg(pool);
const prisma = new PrismaClient();

async function verifyAll() {
    console.log('--- Starting Comprehensive Verification ---');

    // 1. Attendance CRUD
    console.log('--- 1. Attendance Verification ---');
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');
    
    // Create
    const att = await prisma.attendance.create({
        data: { user_id: user.id, date: new Date('2025-01-01'), is_present: true }
    });
    console.log('Attendance Created:', att.id);

    // Update
    const updatedAtt = await prisma.attendance.update({
        where: { id: att.id },
        data: { is_present: false }
    });
    console.log('Attendance Updated:', updatedAtt.is_present === false);

    // Delete
    await prisma.attendance.delete({ where: { id: att.id } });
    console.log('Attendance Deleted');


    // 2. Payments (Financials)
    console.log('--- 2. Financial Verification ---');
    const payment = await prisma.feeLedger.create({
        data: {
            user_id: user.id,
            amount: 500,
            type: 'SUBSCRIPTION',
            transaction_type: 'CREDIT',
            is_paid: true,
            notes: 'Test Subscription Payment'
        }
    });
    console.log('Payment Created:', payment.id);
    
    // Verify it appears in ledger
    const ledger = await prisma.feeLedger.findUnique({ where: { id: payment.id } });
    console.log('Payment Verified:', ledger?.amount === 500 && ledger?.type === 'SUBSCRIPTION');
    
    // Cleanup payment
    await prisma.feeLedger.delete({ where: { id: payment.id } });


    // 3. Fines
    console.log('--- 3. Fines Verification ---');
    // Create Rule
    const rule = await prisma.fineRule.create({
        data: { name: 'Test Rule ' + Date.now(), first_time_fine: 100, subsequent_fine: 200 }
    });
    console.log('Rule Created:', rule.id);

    // Apply Fine (1st time)
    // We mock the controller logic here essentially
    const fine1 = await prisma.userFine.create({
        data: { user_id: user.id, rule_id: rule.id, amount_charged: 100, occurrence: 1 }
    });
    console.log('Fine 1 Applied (100):', fine1.amount_charged);

    // Apply Fine (2nd time)
    const fine2 = await prisma.userFine.create({
        data: { user_id: user.id, rule_id: rule.id, amount_charged: 200, occurrence: 2 }
    });
    console.log('Fine 2 Applied (200):', fine2.amount_charged);

    // Cleanup
    await prisma.userFine.deleteMany({ where: { rule_id: rule.id } });
    await prisma.fineRule.delete({ where: { id: rule.id } });

    console.log('--- Verification Complete ---');
}

verifyAll()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
