import { PrismaClient, UserRole, MatchStatus } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Start seeding ...');

    // 1. Create Users
    // Create Users with passwords (hashed '123456' for example, but for seed we might need raw or hash logic)
    // Since we don't have bcrypt imported in seed usually, we'll import it or mock it.
    // Actually, let's just use a plain string and assume the backend handles it? No, backend compares hash.
    // We need to hash it.

    // NOTE: For simplicity in this fix, I will rely on the user registering a NEW user via the app, 
    // or I will update the seed to include a hashed password.
    // '123456' hashed with bcrypt (cost 10)
    const defaultPasswordHash = '$2b$10$ohh3YZtpRPDoOteHy5E4Vun24B5vEfg6u5scM1zYzJyb/KwlwP9JO';

    const admin = await prisma.user.upsert({
        where: { email: 'admin@sports.com' },
        update: {
            password: defaultPasswordHash,
            user_type: 'SALARIED', // Adjusted to match UserType enum
        },
        create: {
            name: 'Admin User',
            email: 'admin@sports.com',
            phone: '9876543210',
            role: 'MANAGEMENT',
            password: defaultPasswordHash,
            age: 30,
            user_type: 'SALARIED' // Using string literal if enum import is tricky, but better import.
        },
    });

    const player1 = await prisma.user.upsert({
        where: { phone: '9000000001' },
        update: {
            password: defaultPasswordHash
        },
        create: {
            name: 'Player One',
            phone: '9000000001',
            email: 'player1@sports.com',
            role: 'NORMAL',
            age: 20,
            user_type: 'STUDENT'
        },
    });

    const player2 = await prisma.user.upsert({
        where: { phone: '9000000002' },
        update: {
            password: defaultPasswordHash
        },
        create: {
            name: 'Player Two',
            phone: '9000000002',
            email: 'player2@sports.com',
            role: 'NORMAL',
            age: 25,
            user_type: 'NON_EARNED'
        },
    });

    // Seed Masters
    const dailyPlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'Daily Plan' },
        update: {},
        create: {
            name: 'Daily Plan',
            rate_daily: 10,
            rate_monthly: 0,
            is_deposit_required: false
        }
    });

    const monthlyPlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'Monthly Plan' },
        update: {},
        create: {
            name: 'Monthly Plan',
            rate_daily: 0,
            rate_monthly: 200,
            is_deposit_required: true
        }
    });

    const monthlyEarnedFull = await prisma.subscriptionPlan.upsert({
        where: { name: 'Earned (Paid Deposit)' },
        update: {},
        create: {
            name: 'Earned (Paid Deposit)',
            rate_daily: 10,
            rate_monthly: 200,
            is_deposit_required: true,
            monthly_deposit_part: 0
        }
    });

    const monthlyStudent = await prisma.subscriptionPlan.upsert({
        where: { name: 'Student / Non-Earned' },
        update: {},
        create: {
            name: 'Student / Non-Earned',
            rate_daily: 10,
            rate_monthly: 100,
            is_deposit_required: false, // "not paid 2000 have to pay just 100", implying no deposit requirement?
            monthly_deposit_part: 0
        }
    });

    const monthlyEarnedSplit = await prisma.subscriptionPlan.upsert({
        where: { name: 'Earned (Deposit Split)' },
        update: {},
        create: {
            name: 'Earned (Deposit Split)',
            rate_daily: 50, // "50 for daily"
            rate_monthly: 400, // "400 for monthly"
            is_deposit_required: true,
            monthly_deposit_part: 200 // "200 in deposit"
        }
    });

    const smokingFine = await prisma.fineRule.upsert({
        where: { name: 'Smoking' },
        update: {},
        create: {
            name: 'Smoking',
            first_time_fine: 10,
            subsequent_fine: 1000
        }
    });

    console.log('Created Masters:', { dailyPlan, monthlyEarnedFull, monthlyStudent, monthlyEarnedSplit, smokingFine });

    console.log('Created Users:', { admin, player1, player2 });

    // 2. Create Game
    const game = await prisma.game.create({
        data: {
            name: 'Cricket',
        },
    });
    console.log('Created Game:', game);

    // 3. Create Tournament
    const tournament = await prisma.tournament.create({
        data: {
            name: 'Community League 2025',
            game_id: game.id,
            start_date: new Date(),
        },
    });
    console.log('Created Tournament:', tournament);

    // 4. Create Teams
    const teamA = await prisma.team.create({
        data: {
            name: 'Warriors',
            tournament_id: tournament.id,
            players: {
                create: [
                    { user_id: player1.id },
                ],
            },
        },
    });

    const teamB = await prisma.team.create({
        data: {
            name: 'Titans',
            tournament_id: tournament.id,
            players: {
                create: [
                    { user_id: player2.id },
                ],
            },
        },
    });
    console.log('Created Teams:', { teamA, teamB });

    // 5. Create Match
    const match = await prisma.match.create({
        data: {
            tournament_id: tournament.id,
            team_a_id: teamA.id,
            team_b_id: teamB.id,
            start_time: new Date(),
            status: MatchStatus.SCHEDULED,
            overs: 20,
        },
    });
    console.log('Created Match:', match);

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
