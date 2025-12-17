import prisma from '../src/utils/prisma.js';
async function main() {
    const targetId = 12;
    const targetEmail = '91inamali@gmail.com';
    console.log(`Checking user with ID: ${targetId}`);
    try {
        const user = await prisma.user.findUnique({
            where: { id: targetId },
        });
        if (!user) {
            console.log('User not found.');
            return;
        }
        console.log(`Current Role: ${user.role}`);
        console.log(`Current ID: ${user.id}`);
        if (user.role !== 'SUPER_ADMIN' || user.email !== targetEmail) {
            console.log('Updating role to SUPER_ADMIN and setting email...');
            const updated = await prisma.user.update({
                where: { id: user.id },
                data: {
                    role: 'SUPER_ADMIN',
                    email: targetEmail
                },
            });
            console.log(`Updated - Role: ${updated.role}, Email: ${updated.email}`);
        }
        else {
            console.log('User is already SUPER_ADMIN with correct email.');
        }
    }
    catch (e) {
        console.error('Error:', e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
