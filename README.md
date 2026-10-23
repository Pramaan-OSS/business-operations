[![CI](https://github.com/Pramaan-OSS/business-operations/actions/workflows/ci.yml/badge.svg)](https://github.com/Pramaan-OSS/business-operations/actions/workflows/ci.yml)

# Business Operations

```sh
cp .env.example .env # paste PRAMAAN_API_KEY into .env
./start
```

Open http://localhost:3001. Docker with Compose is the only required installation. The start command prepares sign-in and the database, generates internal session keys, and starts Redis, the worker, API and dashboard. The bundled fallback database uses host port 55438.

The default start runs a compiled production dashboard, avoiding development compilation on the first visit to each screen. The first container build takes longer; later starts reuse it.

Sign-in and the database are provided through Pramaan in test mode.

Create an account with managed sign-in or email, then create a workspace. No cloud-console setup is needed. Managed sign-in is checked before the app opens its own session; email comes from the verified token payload after its subject matches the verified account. Manual document and transaction uploads work without connected accounts. If managed sign-in is unavailable, or no key is set, the existing local sign-in remains available.

Existing installation accounts remain available through the optional installation sign-in path. Managed accounts are linked by verified identity, never by matching email.

Managed database provisioning currently answers unavailable, so startup prints one plain line and uses the bundled database. When enabled, the same application queries and migrations use the returned connection. Credentials are saved once under git-ignored `.runtime/` in files with mode 0600 and are never printed. Keep this directory: a lost once-only response needs approved credential recovery, rather than another automatic provisioning attempt.

Managed provisioning saves its request IDs in private `.runtime/` state before calling Pramaan. Retries reuse those IDs; account deletion uses its saved local identity. Missing action headers or other request refusals stop startup with a plain reason instead of silently disabling managed sign-in. Only the declared unavailable result selects the local fallback.

For an offline demonstration, use a dummy key and add `PRAMAAN_FAKE=1` to `.env`. The visible demonstration banner means connected-service results are sample data. The fake transport never falls through to the network.

## Connected services

All outside calls pass through the product’s single Pramaan module, backed by the published `@pramaan/sdk@0.1.0` package. File storage stays on local disk; app data uses the selected application database; background work uses BullMQ and local Redis. Stop the services with Ctrl-C; restart with `./start`. Docker volumes preserve data.

Bank feeds are built against the fake and are not available yet on the live service. Connecting starts a monthly rental for each account only after the person authorises it. Transactions are cursor reads, checked every four hours. Disconnecting confirms revocation before deleting local records.

Connected apps come from the capability catalogue. Their sign-in screens can grant broad access. Actions that send or change information require a separate review and approval. Incoming team chat uses catalogue read actions where available; unsupported channels stay off.

Outcome jobs support review, approval, cancellation and status checks. An uncertain result asks you to check the connected account before starting again. Invoice payments first create a payment link after approval of the displayed amount. If link creation explicitly reports unavailable or a missing connection, hosted checkout is the fallback. Invoice emails and reminders carry the saved URL through the app email client; payment is confirmed only when the full amount and currency are verified. Reports that read the installation owner's financial accounts are restricted to its configured reporting team.

## Connected accounts

Connecting an outside account, such as a mailbox or another app, carries a monthly Pramaan charge for each connected
account, billed to the Pramaan account behind `PRAMAAN_API_KEY`. Signing in is free. Disconnecting an account ends its
charge. Keep the installation key in place until account or workspace deletion has checked and disconnected its accounts. Shared workspaces need another owner before an owner can delete their personal account.

## Optional settings

Leave these unset until needed:

| Setting | Purpose |
|---|---|
| `APP_URL` | Public app address; defaults to the local dashboard address. Only public HTTPS origins are registered; local development skips registration. |
| `ALLOWED_SIGN_IN` | Optional comma-separated verified email addresses allowed through managed sign-in |
| `APP_OWN_SIGN_IN` | Set to `1` to offer installation-owned sign-in alongside managed sign-in |
| `PRAMAAN_BASE_URL` | Alternate capability server |
| `PRAMAAN_FAKE` | Set to `1` for offline sample results |
| `INVOICE_PAYMENT_TAX_CATEGORY` | Explicit category for the installation's invoice payments: `digital_products`, `saas`, `e_book`, `edtech`, or `live_tutoring`. Never inferred. Sources that require a category cannot serve a link until it is selected; checkout remains the availability/connection fallback. |
| `EMAIL_FROM` | Optional sender allowed by a connected email account; defaults to the platform sender |
| `FEEDBACK_EMAIL` | Owner's inbox for support and feedback |
| `PRAMAAN_MESSAGING_TEAM_ID` | Team allowed to use the installation's message sender |
| `PRAMAAN_SETTLEMENT_REPORTS_TEAM_ID` | Team that owns settlement and revenue reporting accounts |
| `PRAMAAN_CASHFLOW_SESSION_REF` | Existing financial-data session for that reporting team |
| `PRAMAAN_ENTERPRISE_ORGANIZATION_REF` | Organisation whose configured enterprise sign-in connections may be used |
| `PRAMAAN_SOCIAL_PROVIDER_KEY` | Connected social sign-in product key |
| `PRAMAAN_SOCIAL_AUTHORIZATION_URL` | Its browser authorisation address |
| `PRAMAAN_SOCIAL_CLIENT_ID` | Its public client identifier |
| `PRAMAAN_SOCIAL_SCOPE` | Its requested sign-in permissions |

Internal signing keys, local service addresses and the database password are generated automatically. Never commit `.env`, `.runtime` or `.data`. Back up private runtime settings, the selected database and local files together. Change the generated local settings only when moving this installation.

## Desktop shell

The desktop shell opens the local dashboard. It has no updater or upload service. It is separate from `./start`; native builds need Bun, Rust and the operating system's Tauri build prerequisites. Run the dashboard first, then run `bun run --cwd apps/desktop tauri:dev`, or `bun run --cwd apps/desktop tauri:build` to build a bundle.

## Licence and source

This template is AGPL-3.0. The original licence notice remains in `LICENSE-ORIGINAL`.

Built on [Midday](https://github.com/midday-ai/midday), originally published by Midday Labs AB under AGPL-3.0, imported at `5158731`.

Outgoing email defaults to `Business Operations <noreply@updates.pramaan.one>` when no sender is configured. Replies to invoices, reminders, invitations and notifications go to the owner’s address. An explicitly configured `EMAIL_FROM` must be allowed by a connected sending account.
