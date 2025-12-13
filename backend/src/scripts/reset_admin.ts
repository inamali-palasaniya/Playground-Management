
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

// Remove manual instantiation since we import the instance
// const prisma = new PrismaClient();

async function main() {
    const email = '91inamali@gmail.com';
    const newPassword = '91Inam@91';

    console.log(`Resetting password for ${email}...`);

    const user = await prisma.user.findFirst({
        where: { OR: [{ email: email }, { phone: email }] } // support searching by phone if email put in phone field by mistake, but specific email was given
    });

    if (!user) {
        console.error('User not found!');
        return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    console.log(`Success! Password for ${user.name} (${user.email}) has been updated.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
