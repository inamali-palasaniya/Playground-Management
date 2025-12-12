
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { getUsers } from '../controllers/user.controller.js';
import { checkSubscriptionPayment } from '../controllers/finance.controller.js';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verify() {
    console.log('--- Verifying Sub Status & Payment Warnings ---');

    console.log('1. Fetching Users for Status Check...');
    // We can't easily call controller directly without req/res mocks usually, 
    // but here we can just test the query logic directly or mock basic req/res
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const users = await prisma.user.findMany({
            include: {
                subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true } },
                fee_ledger: {
                    where: {
                        type: 'SUBSCRIPTION',
                        transaction_type: 'CREDIT',
                        date: { gte: startOfMonth }
                    }
                }
            },
            take: 3
    });

    users.forEach(u => {
        console.log(`User: ${u.name}`);
        const plan = u.subscriptions[0]?.plan;
        if (plan) {
            console.log(` - Plan: ${plan.name} (${plan.rate_monthly ? 'Monthly' : 'Daily'})`);
            if (plan.rate_monthly && plan.rate_monthly > 0) {
                 const status = u.fee_ledger.length > 0 ? 'PAID' : 'EXPIRED';
                 console.log(` - Status: ${status} (Payments found: ${u.fee_ledger.length})`);
            } else {
                 console.log(` - Status: ACTIVE (Daily)`);
            }
        } else {
            console.log(' - No Active Plan');
        }
    });

    console.log('\n2. Verifying Payment Warning Check...');
    const userWithPay = users.find(u => u.fee_ledger.length > 0);
    if (userWithPay) {
        console.log(`Checking duplicates for user ${userWithPay.name} (ID: ${userWithPay.id})...`);
        const payments = await prisma.feeLedger.findMany({
            where: {
                user_id: userWithPay.id,
                type: 'SUBSCRIPTION',
                transaction_type: 'CREDIT',
                date: { gte: startOfMonth }
            }
        });
        console.log(`Found ${payments.length} existing payments (Should matches ledger count above)`);
    } else {
        console.log('No user with payments found to test duplicate check.');
    }

    console.log('--- Done ---');
}

verify().catch(console.error).finally(() => prisma.$disconnect());
