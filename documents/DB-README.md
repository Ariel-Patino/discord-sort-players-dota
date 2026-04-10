# Docker Reset and Database Guide

This document explains how to safely restart the Docker stack for this project and how to work with the MySQL database when seed data changes.

It is written for beginners and uses the current project defaults from `docker-compose.yml`.

---

## Why this guide exists

This project stores data in a MySQL Docker volume.
That means **your database survives normal container restarts**.

Because of that:

- changing `src/store/players.ts` does **not** automatically update existing rows in MySQL
- running `docker compose up --build` again does **not** reset the database by itself
- the seed script only inserts the initial players when the table is empty

If you changed the player seed data, follow the reset steps below.

---

## Project defaults used by Docker

By default, the stack starts these values:

- **Database host:** `mysql`
- **Database port:** `3306`
- **Database name:** `game`
- **Application DB user:** `botuser`
- **Application DB password:** `botpass`
- **MySQL root password:** `rootpass`
- **Main table:** `players`

---

## 1. Normal startup

From the project root, run:

```bash
docker compose up --build
```

This will:

1. build the bot image
2. start MySQL
3. wait until MySQL is healthy
4. run the database initialization script
5. start the Discord bot

If everything is correct, you should see logs similar to:

```text
[bot] Waiting for MySQL at mysql:3306...
[bot] Initializing database if needed...
Database initialized successfully with X players.
[bot] Starting Discord bot...
```

---

## 2. Full database reset when `players.ts` changes

Use this when:

- you changed `src/store/players.ts`
- you changed the DB schema
- you want to reseed the table from scratch
- you want to remove old test data

### Important warning

This process **deletes the persisted MySQL data** stored in Docker volumes.
If you have important data, export it first.

### Step-by-step reset

#### Step 1: Stop the stack and remove volumes

```bash
docker compose down -v
```

What this does:

- stops the containers
- removes the containers
- removes the attached volume data
- wipes the current MySQL database for this project

> The `-v` flag is the key part. Without it, the database is kept.

#### Step 2: Start the stack again

```bash
docker compose up --build
```

This creates a fresh MySQL volume and seeds the database again using the current contents of `src/store/players.ts`.

### Recommended quick reset sequence

```bash
docker compose down -v
docker compose up --build
```

---

## 3. Difference between `down` and `down -v`

| Command | What it does | Does it reset the DB? |
|---|---|---|
| `docker compose down` | Stops and removes containers | **No** |
| `docker compose down -v` | Stops containers and deletes Docker volumes | **Yes** |
| `docker compose up --build` | Rebuilds and starts services | **No, unless the DB volume was removed first** |

---

## 4. How to enter the MySQL database inside Docker

If the stack is already running, open a terminal in the project root and run:

```bash
docker compose exec mysql mysql -uroot -prootpass game
```

You should enter the MySQL prompt, which looks like this:

```text
mysql>
```

### Useful first commands

```sql
SHOW DATABASES;
USE game;
SHOW TABLES;
DESCRIBE players;
SELECT * FROM players LIMIT 20;
```

### How to exit

```sql
exit;
```

or press `Ctrl + C`.

---

## 5. Create a new player manually in the `players` table

If you want to add a new Discord user/player directly into the database, use:

```sql
INSERT INTO players (id, dotaName, `rank`, support, tanque, carry)
VALUES ('new_player_123', 'NewPlayer', 3.5, 1, 0, 1);
```

### Field meaning

- `id`: the Discord username or identifier used by the bot
- `dotaName`: the display name for Dota
- `rank`: numeric skill/rank value
- `support`: `1` for true, `0` for false
- `tanque`: `1` for true, `0` for false
- `carry`: `1` for true, `0` for false

### Example

```sql
INSERT INTO players (id, dotaName, `rank`, support, tanque, carry)
VALUES ('sample.user', 'Sample', 4.0, 1, 0, 1);
```

To confirm the insert worked:

```sql
SELECT * FROM players WHERE id = 'sample.user';
```

---

## 6. Update an existing player

If a player already exists and you only want to change the data, use `UPDATE`.

### Update rank only

```sql
UPDATE players
SET `rank` = 4.5
WHERE id = 'sample.user';
```

### Update name and roles

```sql
UPDATE players
SET dotaName = 'Sample Pro', support = 0, tanque = 1, carry = 1
WHERE id = 'sample.user';
```

### Verify the update

```sql
SELECT * FROM players WHERE id = 'sample.user';
```

---

## 7. Delete a player

To remove one player from the table:

```sql
DELETE FROM players
WHERE id = 'sample.user';
```

To verify:

```sql
SELECT * FROM players WHERE id = 'sample.user';
```

---

## 8. Clear the full table without deleting the whole Docker volume

If you want the application to reseed the players table but do **not** want to delete everything else in Docker, you can clear only the table.

### Option A: remove all rows

```sql
TRUNCATE TABLE players;
```

After that, restart the stack:

```bash
docker compose restart bot
```

Or stop and start again:

```bash
docker compose down
docker compose up --build
```

> If the table is empty, the seed logic can populate it again.

---

## 9. Create a MySQL database user account (advanced)

This is different from adding a player to the `players` table.
This creates a real **MySQL login account**.

Use this only if you understand that it changes database permissions.

### Create a new DB user

```sql
CREATE USER 'readonly_user'@'%' IDENTIFIED BY 'StrongPassword123!';
```

### Give access to the `game` database

```sql
GRANT SELECT, INSERT, UPDATE ON game.* TO 'readonly_user'@'%';
FLUSH PRIVILEGES;
```

### See existing MySQL accounts

```sql
SELECT user, host FROM mysql.user;
```

---

## 10. Beginner troubleshooting

### Problem: I restarted Docker but my old data is still there
That is expected.
You probably ran:

```bash
docker compose down
```

Instead of:

```bash
docker compose down -v
```

### Problem: `players.ts` changed but the DB did not update
That is also expected.
The seed script skips reseeding when the table already contains rows.

### Problem: I cannot connect to MySQL
Make sure the stack is running first:

```bash
docker compose ps
```

Then try again:

```bash
docker compose exec mysql mysql -uroot -prootpass game
```

### Problem: I made a mistake in SQL
Do not worry.
You can either:

- fix the row with another `UPDATE`
- delete the row and insert it again
- reset the whole database with `docker compose down -v`

---

## 11. Safest workflow when player data changes

If you update `src/store/players.ts`, the safest beginner workflow is:

```bash
docker compose down -v
docker compose up --build
```

This guarantees that the running application uses a fresh database seeded from the latest player definitions.

---

## Summary

If you only remember one thing, remember this:

```bash
docker compose down -v
docker compose up --build
```

Use that whenever the seed data or database structure changes and you want a clean restart.
