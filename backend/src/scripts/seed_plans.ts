
import prisma from '../utils/prisma.js';

const PLANS = [
    {
        name: 'Salaried (Deposit Paid)',
        rate_daily: 10,
        rate_monthly: 200,
        monthly_deposit_part: 0,
        is_deposit_required: true
    },
    {
        name: 'Salaried (No Deposit)',
        rate_daily: 50,
        rate_monthly: 400,
        monthly_deposit_part: 200, // Assuming extra 200 is deposit part? Or just higher fee? User said "pay 400".
        is_deposit_required: false
    },
    {
        name: 'Non-Salaried (Adult)',
        rate_daily: 10,
        rate_monthly: 100,
        monthly_deposit_part: 0,
        is_deposit_required: false
    },
    {
        name: 'Non-Salaried (Minor)',
        rate_daily: 0,
        rate_monthly: 0,
        monthly_deposit_part: 0,
        is_deposit_required: false
    }
];

async function main() {
    console.log('Seeding Subscription Plans...');
    for (const plan of PLANS) {
        const upserted = await prisma.subscriptionPlan.upsert({
            where: { name: plan.name },
            update: {
                rate_daily: plan.rate_daily,
                rate_monthly: plan.rate_monthly,
                monthly_deposit_part: plan.monthly_deposit_part,
                is_deposit_required: plan.is_deposit_required
            },
            create: {
                name: plan.name,
                rate_daily: plan.rate_daily,
                rate_monthly: plan.rate_monthly,
                monthly_deposit_part: plan.monthly_deposit_part,
                is_deposit_required: plan.is_deposit_required
            }
        });
        console.log(`Upserted plan: ${upserted.name}`);
    }
    console.log('Seed complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
