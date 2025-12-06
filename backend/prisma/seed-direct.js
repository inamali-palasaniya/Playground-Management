const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Create Users
    console.log('Seeding Users...');
    const users = [
      { name: 'Admin User', phone: '9876543210', email: 'admin@sports.com', role: 'MANAGEMENT' },
      { name: 'Player One', phone: '9000000001', email: 'player1@sports.com', role: 'NORMAL' },
      { name: 'Player Two', phone: '9000000002', email: 'player2@sports.com', role: 'NORMAL' },
    ];

    const userIds = {};

    for (const u of users) {
      const res = await client.query(`
        INSERT INTO "User" (name, phone, email, role, deposit_amount)
        VALUES ($1, $2, $3, $4::"UserRole", 0)
        ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `, [u.name, u.phone, u.email, u.role]);
      userIds[u.phone] = res.rows[0].id;
      console.log(`Upserted User: ${u.name} (ID: ${userIds[u.phone]})`);
    }

    // 2. Create Game
    console.log('Seeding Game...');
    let gameId;
    const gameRes = await client.query(`
      INSERT INTO "Game" (name) VALUES ('Cricket')
      RETURNING id;
    `);
    // Note: If game exists, this might fail or duplicate. Ideally should check or Upsert if constraint exists.
    // Prisma usage usually relies on ID but here name is not unique in schema.
    // I'll leave as insert, assuming clean DB or just keep adding. 
    // To be safer, let's select first.
    const existingGame = await client.query(`SELECT id FROM "Game" WHERE name = 'Cricket' LIMIT 1`);
    if (existingGame.rows.length > 0) {
      gameId = existingGame.rows[0].id;
    } else {
      gameId = gameRes.rows[0].id;
    }
    console.log(`Game ID: ${gameId}`);

    // 3. Create Tournament
    console.log('Seeding Tournament...');
    const tournamentRes = await client.query(`
      INSERT INTO "Tournament" (name, game_id, start_date)
      VALUES ($1, $2, $3)
      RETURNING id;
    `, ['Community League 2025', gameId, new Date()]);
    const tournamentId = tournamentRes.rows[0].id;
    console.log(`Tournament ID: ${tournamentId}`);

    // 4. Create Teams
    console.log('Seeding Teams...');
    const teamA_Res = await client.query(`
      INSERT INTO "Team" (name, tournament_id) VALUES ($1, $2) RETURNING id;
    `, ['Warriors', tournamentId]);
    const teamA_Id = teamA_Res.rows[0].id;

    const teamB_Res = await client.query(`
      INSERT INTO "Team" (name, tournament_id) VALUES ($1, $2) RETURNING id;
    `, ['Titans', tournamentId]);
    const teamB_Id = teamB_Res.rows[0].id;

    // Link Players to Teams
    await client.query(`INSERT INTO "TeamPlayer" (team_id, user_id) VALUES ($1, $2)`, [teamA_Id, userIds['9000000001']]);
    await client.query(`INSERT INTO "TeamPlayer" (team_id, user_id) VALUES ($1, $2)`, [teamB_Id, userIds['9000000002']]);

    
    // 5. Create Match
    console.log('Seeding Match...');
    const matchRes = await client.query(`
      INSERT INTO "Match" (tournament_id, team_a_id, team_b_id, start_time, status, overs)
      VALUES ($1, $2, $3, $4, $5::"MatchStatus", 20)
      RETURNING id;
    `, [tournamentId, teamA_Id, teamB_Id, new Date(), 'SCHEDULED']);
    console.log(`Match ID: ${matchRes.rows[0].id}`);

    console.log('Seeding Completed Successfully via Direct PG.');

  } catch (e) {
    console.error('Seeding Failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
