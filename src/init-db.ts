import dotenv from 'dotenv';
dotenv.config();

import { db } from './db';
import { players } from './store/players';

async function init() {
  const table = process.env.DB_TABLE || 'players';

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

  for (const [id, info] of Object.entries(players)) {
    await db.query(
      `INSERT INTO \`${table}\` (id, dotaName, \`rank\`, support, tanque, carry)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         dotaName = VALUES(dotaName),
         \`rank\` = VALUES(\`rank\`),
         support = VALUES(support),
         tanque = VALUES(tanque),
         carry = VALUES(carry);`,
      [id, info.dotaName, info.rank, info.support, info.tanque, info.carry]
    );
  }

  console.log('Updated databse successfuly.');
  process.exit(0);
}

init().catch((err) => {
  console.error('Error starting db:', err);
  process.exit(1);
});
