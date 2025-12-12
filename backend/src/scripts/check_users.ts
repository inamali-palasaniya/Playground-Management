
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
        const users = await prisma.user.findMany({
            where: {
                email: ""
            }
        });
        console.log('Users with empty email:', users);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
})();
