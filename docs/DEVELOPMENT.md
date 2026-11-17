# Development

## Runtime and installation

Use Node 24.22.1 and npm 11.9.0. CI reads `.nvmrc`; server and frontend dependencies are installed from their lockfiles with `npm run setup`.

On Linux environments with an unwritable npm cache, use an explicitly writable cache:

```sh
npm_config_cache=/tmp/lifeos-npm npm run setup
```

## Local services

`npm run dev:api` seeds the isolated SQLite database if necessary and starts the API on loopback port 3001. `npm run dev:web` starts Vite on loopback port 5173. Stop each process with Ctrl+C.

These launchers fix the local database path, API address, and development signing configuration. They do not start the bot, scheduler, or paid model calls. Synthetic seed dates are relative to the first seed run; they may eventually fall outside the dashboard's recent date range.

To reset synthetic data, stop all local processes, move `.local/` to a backup location, and run `npm run dev:seed` again. Never apply this procedure to production data.

The development website is not a public read-only demo. Its account-ID login is intended only for local use. The Telegram widget is intentionally unconfigured in this mode.

## Optional dedicated test bot

Use a separate Telegram test bot, not a bot serving real users.

1. Copy `server/.env.bot.local.example` to `server/.env.bot.local`.
2. Set `TELEGRAM_TOKEN` and `ANTHROPIC_API_KEY` in that ignored file.
3. Start the local API and frontend.
4. Run `npm run dev:bot` in another terminal.

The launcher uses the same isolated local database and does not start cron. Real model requests may incur charges. Without the key file or required keys, startup stops with an explanatory message.

The bot's local login link points to `127.0.0.1:5173`; it must be opened on the computer running the frontend. It will not connect from a different device through that device's loopback address.

## Configuration boundaries

- `server/.env.example`: production-oriented server variables and storage path example.
- `main/.env.example`: frontend API address and Telegram widget username.
- `server/.env.bot.local.example`: credentials for the optional local test bot.
- `HOST`: optional API bind interface; the local launcher forces loopback.

Frontend environment variables are public build inputs. Never place model keys, bot tokens, or JWT signing secrets in `VITE_*` variables. Databases and credential files are excluded from Git.

No production database, hosting credentials, or live model connectivity has been verified by the local setup checks.
