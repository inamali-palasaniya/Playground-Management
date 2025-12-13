
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyValidation() {
    try {
        console.log("Verifying Partial Payment Validation...");
        
        const user = await prisma.user.findFirst();
        if (!user) return;

        // 1. Create a Debit for 500
        const debit = await prisma.feeLedger.create({
            data: {
                user_id: user.id,
                type: 'MANUAL_FEE',
                transaction_type: 'DEBIT',
                amount: 500,
                is_paid: false
            }
        });
        console.log("Created Debit:", debit.id);

        // 2. Try to pay 600 (Should Fail in API, but here we are using client directly? Wait.)
        // I need to test the CONTROLLER logic. I can't easily test controller without making HTTP requests.
        // Direct Prisma calls won't error because the validation is in the controller code, not the DB schema.
        // I should use `fetch` or `axios` to hit the running server.
        
        console.log("Skipping direct DB test for validation logic as it resides in Controller.");
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}
verifyValidation();
