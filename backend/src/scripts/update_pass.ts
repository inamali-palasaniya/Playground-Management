import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DIRECT_URL or DATABASE_URL not found in environment');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = await prisma.user.update({
      where: { email: 'pinamali809@gmail.com' },
      data: { password: hashedPassword }
    });
    console.log('Admin password updated successfully for:', user.email);
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();