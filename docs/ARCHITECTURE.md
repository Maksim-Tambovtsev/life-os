# Architecture

## Components

- **Frontend:** React/TypeScript application built with Vite. Displays the landing page, login, profile settings, reflection history, and charts.
- **API:** Express server exposes authentication and user-scoped profile and statistics endpoints.
- **Persistence:** SQLite, accessed through `server/db.js` using better-sqlite3.
- **Telegram bot:** Telegraf handlers collect profile information and reflection answers.
- **Model adapter:** `coach.js` and `prompts.js` prepare model context and requests.
- **Scheduler:** `cron.js` is a separate process for reminders and periodic reports.

## Data flow

Daily entry: Telegram → bot handlers → SQLite → model integration → stored summary and bot reply.

Dashboard: browser → authenticated API → user-scoped SQLite queries → charts and history.

The Telegram login flow issues a short-lived one-time link. The website exchanges it for a signed session token. Development account-ID login is a separate local-only path.

## Runtime boundaries

The local API and frontend can run without Telegram or model credentials. Production and live integration checks are separate from local validation. Public deployment needs explicit configuration of authentication, storage, environment variables, and operating limits.

Synthetic development data must remain separate from real user records. Model availability must not be treated as proof that a user's entry has been saved.
