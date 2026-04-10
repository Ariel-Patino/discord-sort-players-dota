# Discord Sort Players Dota

## Quick start with Docker

This project now starts the full stack with a single command:

```bash
docker compose up --build
```

It will automatically:

1. start MySQL
2. wait until the database is healthy
3. create the `players` table if it does not exist
4. seed the initial players only on the first run
5. start the Discord bot

---

## 1. Create `.env`

### Windows

```powershell
Copy-Item ".env example" .env
```

### Linux / macOS

```bash
cp ".env example" .env
```

Then set your Discord bot token:

```env
TOKEN=your-discord-bot-token
```

> The database settings are already managed by Docker for the default setup.

---

## 2. Start everything

```bash
docker compose up --build
```

Or, if you prefer:

```bash
npm start
```

---

## 3. What you should see

The bot container should log something like:

```text
[bot] Initializing database if needed...
Database initialized successfully with X players.
Bot <tag> is up!
```

On later restarts, the seed is skipped automatically:

```text
Players table already initialized with N rows. Skipping seed.
```

---

## Helpful commands

```bash
docker compose up --build
docker compose down
docker compose logs -f bot
```

Or via npm:

```bash
npm start
npm run docker:down
npm run docker:logs
```

---

## Optional local development without Docker

If you already have a MySQL instance running outside Docker, set the `DB_*` values in `.env` and use:

```bash
npm install
npm run setup-db
npm run dev
```

- `npm start` boots the full Docker stack
- `npm run dev` starts only the bot process
