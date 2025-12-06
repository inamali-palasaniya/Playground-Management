import { PrismaClient, UserRole, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient({});

async function main() {
    console.log('Start seeding ...');

    // 1. Create Users
    const admin = await prisma.user.upsert({
        where: { phone: '9876543210' },
        update: {},
        create: {
            name: 'Admin User',
            phone: '9876543210',
            email: 'admin@sports.com',
            role: UserRole.MANAGEMENT,
        },
    });

    const player1 = await prisma.user.upsert({
        where: { phone: '9000000001' },
        update: {},
        create: {
            name: 'Player One',
            phone: '9000000001',
            email: 'player1@sports.com',
            role: UserRole.NORMAL,
        },
    });

    const player2 = await prisma.user.upsert({
        where: { phone: '9000000002' },
        update: {},
        create: {
            name: 'Player Two',
            phone: '9000000002',
            email: 'player2@sports.com',
            role: UserRole.NORMAL,
        },
    });

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
