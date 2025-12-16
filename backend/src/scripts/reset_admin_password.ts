import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';

// const prisma = new PrismaClient(); // Removed local init

async function main() {
    const email = 'admin@sports.com';
    const password = '123456';

    console.log(`Resetting password for ${email}...`);

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword },
            create: {
                name: 'Admin User',
                email,
                phone: '9876543210',
                role: 'MANAGEMENT',
                password: hashedPassword,
                age: 30,
                user_type: 'SALARIED',
            },
        });
        console.log(`Admin user upserted successfully. ID: ${user.id}`);
    } catch (error) {
        console.error('Error updating password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
