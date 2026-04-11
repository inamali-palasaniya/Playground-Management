
import prisma from '../utils/prisma.js';

async function main() {
    const targetId = 12;
    const targetEmail = '91inamali@gmail.com';
    console.log(`Checking user with ID: ${targetId}`);

    try {
        let user = await prisma.user.findUnique({
            where: { id: targetId },
        });

        if (!user) {
            console.log(`User with ID ${targetId} not found, searching by email: ${targetEmail}`);
            user = await prisma.user.findUnique({
                where: { email: targetEmail },
            });
        }

        if (!user) {
            console.log('User not found by ID or Email.');
            return;
        }

        console.log(`User Found - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);

        if (user.role !== 'SUPER_ADMIN') {
            console.log('Updating role to SUPER_ADMIN...');
            const updated = await prisma.user.update({
                where: { id: user.id },
                data: {
                    role: 'SUPER_ADMIN',
                    is_active: true // Ensure they are active too
                },
            });
            console.log(`Updated - Role: ${updated.role}`);
        } else {
            console.log('User is already SUPER_ADMIN.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
