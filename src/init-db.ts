import Logger from '@src/infrastructure/logging/Logger';
import { registerProcessErrorHandlers } from '@src/infrastructure/logging/process-hooks';
import { db } from './db';
import { config } from './config';
import { players } from './store/players';

registerProcessErrorHandlers({
  commandName: 'setup-db',
});

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
    Logger.info('Players table already initialized. Skipping seed data.', {
      commandName: 'setup-db',
      guildId: null,
      userId: null,
      metadata: {
        table,
        totalPlayers,
      },
    });
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

  Logger.info('Database initialized successfully.', {
    commandName: 'setup-db',
    guildId: null,
    userId: null,
    metadata: {
      table,
      seededPlayers: Object.keys(players).length,
    },
  });
  await db.end();
}

init().catch(async (err) => {
  Logger.fromError('Error initializing the database.', err, {
    commandName: 'setup-db',
    guildId: null,
    userId: null,
  });
  await db.end();
  process.exit(1);
});
