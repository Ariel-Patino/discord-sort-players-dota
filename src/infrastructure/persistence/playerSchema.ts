import { RowDataPacket } from 'mysql2';
import { db } from '@src/db';

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/gu, '``')}\``;
}

export async function ensurePlayerTableSchema(tableName: string): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id VARCHAR(255) PRIMARY KEY,
      dotaName VARCHAR(255),
      \`rank\` DECIMAL(4,2),
      attributes JSON NULL
    );
  `);

  const [columns] = await db.query<ColumnRow[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );

  if (!columns.some((column) => column.COLUMN_NAME === 'attributes')) {
    await db.query(
      `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN attributes JSON NULL`
    );
  }

  await db.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`rank\` DECIMAL(4,2)`);

  await db.query(
    `UPDATE ${quoteIdentifier(tableName)} SET attributes = JSON_OBJECT() WHERE attributes IS NULL`
  );
}
