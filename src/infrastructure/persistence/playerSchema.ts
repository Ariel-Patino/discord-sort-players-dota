import { RowDataPacket } from 'mysql2';
import { db } from '@src/db';

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

const DEFAULT_ATTRIBUTE_PROFICIENCY = 50;

function buildLegacyFlagExpression(
  availableColumns: Set<string>,
  preferredColumn: string
): string {
  if (availableColumns.has(preferredColumn)) {
    return `IFNULL(\`${preferredColumn}\`, 0)`;
  }

  return '0';
}

function resolveDeprecatedTankColumnName(
  availableColumns: Set<string>
): string | undefined {
  return [...availableColumns].find(
    (columnName) => /^tan.*e$/u.test(columnName) && columnName !== 'tank'
  );
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

  const availableColumns = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!availableColumns.has('attributes')) {
    await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN attributes JSON NULL`);
    availableColumns.add('attributes');
  }

  const deprecatedTankColumn = resolveDeprecatedTankColumnName(availableColumns);

  if (deprecatedTankColumn) {
    await db.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${deprecatedTankColumn}\``);
    availableColumns.delete(deprecatedTankColumn);
  }

  await db.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`rank\` DECIMAL(4,2)`);

  const supportFlagExpression = buildLegacyFlagExpression(
    availableColumns,
    'support'
  );
  const tankFlagExpression = buildLegacyFlagExpression(availableColumns, 'tank');
  const carryFlagExpression = buildLegacyFlagExpression(availableColumns, 'carry');

  await db.query(`
    UPDATE \`${tableName}\`
    SET attributes = JSON_OBJECT(
      'support', JSON_OBJECT('isActive', ${supportFlagExpression} <> 0, 'proficiency', ${DEFAULT_ATTRIBUTE_PROFICIENCY}),
      'tank', JSON_OBJECT('isActive', ${tankFlagExpression} <> 0, 'proficiency', ${DEFAULT_ATTRIBUTE_PROFICIENCY}),
      'carry', JSON_OBJECT('isActive', ${carryFlagExpression} <> 0, 'proficiency', ${DEFAULT_ATTRIBUTE_PROFICIENCY})
    )
    WHERE attributes IS NULL
  `);
}
