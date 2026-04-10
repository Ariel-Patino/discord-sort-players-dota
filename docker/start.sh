#!/bin/sh
set -eu

echo "[bot] Waiting for MySQL at ${DB_HOST:-mysql}:${DB_PORT:-3306}..."
until node -e "const mysql = require('mysql2/promise'); const host = process.env.DB_HOST || 'mysql'; const port = Number(process.env.DB_PORT || 3306); const user = process.env.DB_USER || 'botuser'; const password = process.env.DB_PASSWORD || 'botpass'; const database = process.env.DB_NAME || 'game'; mysql.createConnection({ host, port, user, password, database }).then((connection) => connection.end()).then(() => process.exit(0)).catch(() => process.exit(1));"; do
  echo "[bot] MySQL is not ready yet. Retrying in 3 seconds..."
  sleep 3
done

echo "[bot] Initializing database if needed..."
npm run setup-db

echo "[bot] Starting Discord bot..."
exec npm run start:bot
