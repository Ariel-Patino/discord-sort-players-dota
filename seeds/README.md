# Player Seeds

This folder contains player seed files for first-time database initialization.

## Default example

The repository ships with:

- `seeds/example.players.json`

That file is kept as a working example seed for published plugin users.

## Expected format

Each seed file must be a JSON object keyed by player ID.

Each player entry must contain:

- `dotaName`: string
- `rank`: number
- `attributes`: object where each key maps to a numeric value from `0` to `100`

Example:

```json
{
  "player.one": {
    "dotaName": "Player One",
    "rank": 3.5,
    "attributes": {
      "support": 70,
      "carry": 20,
      "tank": 0
    }
  }
}
```

## Using your own seed

Set `PLAYER_SEED_FILE` to the relative path of your seed file.

Example:

```env
PLAYER_SEED_FILE=seeds/my-community.players.json
```

The path is resolved from the project root.

## Important behavior

- The seed is only applied when the `players` table is empty.
- Changing a seed file does not modify existing rows.
- To apply a changed seed, reset the database and run setup again.