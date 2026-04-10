import { db } from './db';
import { config } from './config';
import { players } from './store/players';

async function init() {
  const table = config.dbTable;

  await db.query(`
    CREATE TABLE IF NOT EXISTS \`${table}\` (
      id VARCHAR(255) PRIMARY KEY,
      dotaName VARCHAR(255),
      \`rank\` DECIMAL(3,1),
      support BOOLEAN,
      tanque BOOLEAN,
      carry BOOLEAN
    );
  `);

  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM \`${table}\`;`);
  const totalPlayers = Number((rows as Array<{ total: number }>)[0]?.total ?? 0);

  if (totalPlayers > 0) {
    console.log(
      `Players table already initialized with ${totalPlayers} rows. Skipping seed.`
    );
    await db.end();
    return;
  }

  for (const [id, info] of Object.entries(players)) {
    await db.query(
      `INSERT INTO \`${table}\` (id, dotaName, \`rank\`, support, tanque, carry)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, info.dotaName, info.rank, info.support, info.tanque, info.carry]
    );
  }

  console.log(
    `Database initialized successfully with ${Object.keys(players).length} players.`
  );
  await db.end();
}

init().catch(async (err) => {
  console.error('Error initializing db:', err);
  await db.end();
  process.exit(1);
});
