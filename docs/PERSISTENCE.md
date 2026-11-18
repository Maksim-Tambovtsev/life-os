# Reflection persistence

## Workflow state

The bot persists the active workflow type, current step, and structured answers in SQLite. `/reflection` resumes an existing draft; `/cancel` removes the draft without deleting completed entries. Free-form chat history remains temporary.

Within a bot process, updates for each chat are serialized. A completed step and its processed update ID are committed together. Duplicate Telegram updates do not advance the step or create another submission.

## Submission lifecycle

The original answers, check-in, reflection, submission ID, and processed update marker are saved in one transaction before model analysis starts. A failed write rolls back the transaction and preserves the draft for a later attempt.

Analysis is stored separately as `pending`, `succeeded`, or `failed`. A provider failure preserves the original entry and leaves goal progress unknown. Goal analysis accepts a boolean result; malformed results are not coerced into success.

`/replace` explicitly confirms replacement of the current day's snapshot. Previous values are archived before the snapshot is updated. A late analysis result from an earlier submission cannot overwrite a newer replacement. Existing historical duplicate rows are preserved.

Partial profile updates retain omitted fields, including the user's goal, onboarding state, and saved plan.

## Database changes

The persistence migration creates `schema_migrations`, `bot_drafts`, `processed_updates`, `reflection_submissions`, and `reflection_revisions`. It also adds submission and analysis-status fields to reflections. Migration application is transactional and recorded for subsequent startups.

Before applying changes to a real database, create and verify a backup. Deployment and live migration against user records have not been tested. Any future account-deletion or retention implementation must include drafts, update markers, submissions, and archived revisions.

## Validation

From the repository root:

```sh
npm run check
```

Focused tests from `server/`:

```sh
node persistence.test.js
node bot.persistence.test.js
```

Tests use temporary databases and mocked provider/Telegram interactions. Coverage includes rollback after a forced write error, repeated updates, handler restart, concurrent replies, provider failure, confirmed replacement, stale results, delivery failure, and cancellation.

## Current limitations

- A process interruption after saving can leave analysis `pending`; there is no automatic recovery or retry worker yet.
- Calendar-day boundaries still follow the existing UTC behavior. User time zones and historical duplicate cleanup are outside this change.
- Analysis status is persisted; dashboard-specific status presentation is not implemented here.
- Live Telegram delivery, provider availability, and production storage require separate verification.
