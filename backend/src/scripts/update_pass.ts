import { PrismaClient } from '../generated/client/client.js';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Error: DIRECT_URL or DATABASE_URL not found in environment');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url,
    },
  },
});

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = await prisma.user.update({
      where: { email: 'admin@sports.com' },
      data: { password: hashedPassword }
    });
    console.log('Admin password updated successfully for:', user.email);
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await prisma.$disconnect();
  }
})();