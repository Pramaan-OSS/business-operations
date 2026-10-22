# @business-operations-ai/cli

Run your business from the command line. The Business Operations CLI gives you full access to transactions, invoices, time tracking, reports, and more — designed for humans and AI agents alike.

## Install

```bash
npx @business-operations-ai/cli@latest
```

Or install globally:

```bash
npm install -g @business-operations-ai/cli
```

## Authentication

```bash
business-operations auth login          # Opens browser for OAuth
business-operations auth login --no-browser  # Prints URL to open manually
business-operations auth status         # Check current session
business-operations auth logout         # Clear stored credentials
```

You can also authenticate with an API key:

```bash
echo $BUSINESS_OPERATIONS_API_KEY | business-operations auth login --token-stdin
```

## Commands

### Transactions

| Command | Description |
|---------|-------------|
| `business-operations transactions list` | List transactions |
| `business-operations transactions get <id>` | Get transaction details |
| `business-operations transactions create` | Create a manual transaction |
| `business-operations transactions update <id>` | Update a transaction |
| `business-operations transactions delete <id>` | Delete a transaction |

```bash
business-operations transactions list --from 2026-01-01 --to 2026-03-31
business-operations transactions list --search "Spotify" --category software
business-operations transactions create --name "Office Supplies" --amount -49.99 --currency USD --account acc_123
```

### Invoices

| Command | Description |
|---------|-------------|
| `business-operations invoices list` | List invoices |
| `business-operations invoices get <id>` | Get invoice details |
| `business-operations invoices create` | Create an invoice |
| `business-operations invoices send <id>` | Send to customer |
| `business-operations invoices update <id>` | Update an invoice |
| `business-operations invoices delete <id>` | Delete an invoice |
| `business-operations invoices mark-paid <id>` | Mark as paid |
| `business-operations invoices remind <id>` | Send payment reminder |

```bash
business-operations invoices list --status unpaid
business-operations invoices create --customer cust_123 --due-date 2026-04-30
business-operations invoices send inv_abc123
```

### Customers

| Command | Description |
|---------|-------------|
| `business-operations customers list` | List customers |
| `business-operations customers get <id>` | Get customer details |
| `business-operations customers create` | Create a customer |
| `business-operations customers update <id>` | Update a customer |
| `business-operations customers delete <id>` | Delete a customer |

```bash
business-operations customers list --search "Acme"
business-operations customers create --name "Acme Corp" --email billing@acme.com
```

### Time Tracking

| Command | Description |
|---------|-------------|
| `business-operations tracker start` | Start the timer |
| `business-operations tracker stop` | Stop the timer |
| `business-operations tracker status` | Show current timer |
| `business-operations tracker projects list` | List projects |
| `business-operations tracker projects create` | Create a project |

```bash
business-operations tracker start --project proj_abc --description "API development"
business-operations tracker stop
business-operations tracker projects create --name "Website Redesign" --rate 150
```

### Bank Accounts

| Command | Description |
|---------|-------------|
| `business-operations bank-accounts list` | List connected accounts |
| `business-operations bank-accounts balances` | Show all balances |
| `business-operations bank-accounts get <id>` | Get account details |

### Inbox

| Command | Description |
|---------|-------------|
| `business-operations inbox list` | List inbox items |
| `business-operations inbox get <id>` | Get item details |
| `business-operations inbox match <id>` | Match to transaction |
| `business-operations inbox delete <id>` | Delete an item |

```bash
business-operations inbox list --status pending
business-operations inbox match inb_abc --transaction txn_def
```

### Reports

| Command | Description |
|---------|-------------|
| `business-operations reports revenue` | Revenue report |
| `business-operations reports profit` | Profit report |
| `business-operations reports burn-rate` | Monthly burn rate |
| `business-operations reports runway` | Cash runway estimate |
| `business-operations reports expenses` | Expense breakdown |
| `business-operations reports spending` | Spending by category |

```bash
business-operations reports revenue --from 2026-01-01 --to 2026-03-31
business-operations reports runway --currency USD
business-operations reports spending --json
```

### Documents

| Command | Description |
|---------|-------------|
| `business-operations documents list` | List documents |
| `business-operations documents get <id>` | Get document details |
| `business-operations documents delete <id>` | Delete a document |

### Categories

| Command | Description |
|---------|-------------|
| `business-operations categories list` | List categories |
| `business-operations categories create` | Create a category |
| `business-operations categories update <id>` | Update a category |
| `business-operations categories delete <id>` | Delete a category |

### Tags

| Command | Description |
|---------|-------------|
| `business-operations tags list` | List tags |
| `business-operations tags create` | Create a tag |
| `business-operations tags delete <id>` | Delete a tag |

### Products

| Command | Description |
|---------|-------------|
| `business-operations products list` | List invoice products |
| `business-operations products get <id>` | Get product details |
| `business-operations products create` | Create a product |
| `business-operations products update <id>` | Update a product |
| `business-operations products delete <id>` | Delete a product |

### Team

| Command | Description |
|---------|-------------|
| `business-operations team info` | Show team information |
| `business-operations team members` | List team members |

### Search

```bash
business-operations search "Acme"
business-operations search "office supplies" --json
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (default when piped) |
| `--table` | Output as table (default in terminal) |
| `--agent` | Agent mode: JSON, no prompts, no spinners |
| `--quiet` | Suppress progress output |
| `--dry-run` | Preview destructive actions |
| `--debug` | Verbose HTTP logging to stderr |
| `--api-url <url>` | Override API base URL |

## Agent & MCP Integration

The CLI is designed to work seamlessly with AI agents. Use `--agent` or `--json` for structured output:

```bash
business-operations --agent transactions list --from 2026-01-01
business-operations invoices list --json | jq '.data[].invoiceNumber'
```

Pipe data in with `--stdin`:

```bash
cat invoice.json | business-operations invoices create --stdin
echo $API_KEY | business-operations auth login --token-stdin
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BUSINESS_OPERATIONS_API_KEY` | API key (skip `auth login`) |
| `BUSINESS_OPERATIONS_API_URL` | Override API endpoint |
| `BUSINESS_OPERATIONS_DASHBOARD_URL` | Override dashboard URL for OAuth |
| `NO_COLOR` | Disable colored output |

## Development

```bash
bun run dev -- auth login       # Run locally
bun run build                   # Build for distribution
bun run typecheck               # Type checking
bun run lint                    # Lint
```

## License

See the [LICENSE](../../LICENSE) file in the repository root.
