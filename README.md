# Life OS

A Telegram reflection assistant with a React dashboard. The bot collects daily entries, the Node.js backend stores them in SQLite, and an Anthropic integration generates summaries.

The application is currently under development. Local development uses synthetic profiles and does not require Telegram or Anthropic credentials.

## Quick start

Requirements: Node.js **24.22.1** (see `.nvmrc`) and npm **11.9.0**. With nvm, run `nvm install` and `nvm use` first.

From the repository root:

```sh
npm run setup
npm run dev:seed
```

Start the API and frontend in separate terminals:

```sh
npm run dev:api
```

```sh
npm run dev:web
```

Open **http://127.0.0.1:5173**, select the dashboard button, and use the development login:

| Profile ID | Data |
| --- | --- |
| `demo-owner` | Seven synthetic daily entries |
| `demo-other` | Empty profile |

The local API binds to `127.0.0.1:3001`. Data is stored in `.local/lifeos-dev.db`. Re-running the seed preserves existing profiles and does not duplicate entries. The development login and bundled local signing secret must never be exposed publicly.

## Validation

```sh
npm run check
```

Runs server syntax checks, database tests, and the TypeScript/Vite production build. Live Telegram delivery, Anthropic responses, and production configuration require separate verification.

## Project structure

- `main/`: React, TypeScript, Vite, and dashboard components.
- `server/`: Express API, SQLite persistence, authentication, Telegram handlers, and model integration.
- `scripts/`: local launchers and validation commands.
- `docs/`: developer-facing setup and architecture documentation.

See [Development](docs/DEVELOPMENT.md) for configuration and the optional test bot, and [Architecture](docs/ARCHITECTURE.md) for component boundaries.

## Deployment

Automatic Vercel Git deployments are paused through `git.deploymentEnabled=false` in the repository and frontend configurations. This does not stop an existing deployment. Review the settings before enabling a deployment again.

Do not run `dev:*` launchers on a public server. Production requires separate credentials, persistent storage, and development login disabled.
