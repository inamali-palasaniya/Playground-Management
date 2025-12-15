const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRole() {
  const user = await prisma.user.findUnique({
    where: { email: '91inamali@gmail.com' },
  });
  console.log('User Role Check:', user ? user.role : 'User not found');
}

checkUserRole()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
