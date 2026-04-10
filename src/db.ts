import mysql from 'mysql2/promise';
import { getDatabaseConfig } from './config';

const databaseConfig = getDatabaseConfig();

export const db = mysql.createPool({
  host: databaseConfig.host,
  port: databaseConfig.port,
  user: databaseConfig.user,
  password: databaseConfig.password,
  database: databaseConfig.name,
  waitForConnections: true,
  connectionLimit: databaseConfig.connectionLimit,
  queueLimit: 0,
});
