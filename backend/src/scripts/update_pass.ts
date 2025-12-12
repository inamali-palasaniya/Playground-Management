import { PrismaClient } from '../generated/client/client.js';
const prisma = new PrismaClient();
(async () => {
  await prisma.user.update({ where: { email: 'admin@sports.com' }, data: { password: 'b.i.8/z.d.d.d.d.d.e.d.d.d.d.d.d.d.d.d.d.d.d.d.d' } });
  console.log('Admin password updated');
})();