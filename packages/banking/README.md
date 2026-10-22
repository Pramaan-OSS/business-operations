# Bank feeds

`BankFeeds` uses the shared Pramaan client for institution search, authorised connections, accounts, balances and cursor-based transaction reads. The offline fake exercises the same contracts. Live feeds show “not available yet” until the operator has enabled support.

Starting a connection begins a monthly per-account rental after the person authorises. The dashboard explains this before consent, without quoting a price.

The local BullMQ worker polls `banking.transactions.sync` every four hours, persists the cursor and imports stable records into the dashboard tables. Reads do not trigger a paid refresh. Revocation precedes local connection deletion. Old stored connections stay visible as legacy records and require a new connection.

See the root README and DONE.md for setup and checks.
