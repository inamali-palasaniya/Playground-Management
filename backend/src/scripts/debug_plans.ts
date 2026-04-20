import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.subscriptionPlan.findMany();
  console.log('Plans:', JSON.stringify(plans, null, 2));
  
  const subscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true }
  });
  console.log('Active Subscriptions Sample:', JSON.stringify(subscriptions.slice(0, 3), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
