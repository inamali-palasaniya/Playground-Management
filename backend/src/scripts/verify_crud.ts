
import { PrismaClient } from '../generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

(async () => {
  try {
    console.log('--- Starting User CRUD Verification ---');

    // 1. Create a temporary user
    const timestamp = Date.now();
    const tempUser = await prisma.user.create({
      data: {
        name: `Verify User ${timestamp}`,
        phone: `+999${timestamp}`,
        email: `verify${timestamp}@example.com`,
        role: 'NORMAL'
      }
    });
    console.log('1. Created Temp User:', tempUser.id, tempUser.name);

    // 2. Update the user
    const updatedName = `Updated Verify User ${timestamp}`;
    const updatedUser = await prisma.user.update({
        where: { id: tempUser.id },
        data: { name: updatedName }
    });

    if (updatedUser.name === updatedName) {
        console.log('2. Update User Verification: SUCCESS');
    } else {
        console.error('2. Update User Verification: FAILED', updatedUser);
    }

    // 3. Delete the user
    await prisma.user.delete({
        where: { id: tempUser.id }
    });
    console.log('3. Deleted Temp User');

    // 4. Verify deletion
    const deletedUser = await prisma.user.findUnique({
        where: { id: tempUser.id }
    });

    if (!deletedUser) {
        console.log('4. Delete User Verification: SUCCESS');
    } else {
        console.error('4. Delete User Verification: FAILED (User still exists)');
    }

    console.log('--- Verification Complete ---');

  } catch(e) {
    console.error('Verification Error:', e);
  } finally {
     await prisma.$disconnect();
     await pool.end();
  }
})();
