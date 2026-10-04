# Folio

Sepolia real-estate share demo. The frontend lists properties and a connected wallet’s holdings. An Express API stores contract snapshots and event logs in Postgres.

- Estate contract: `0x54574F15f751Ef56B6cE556c6D20a5D39bc4013f`
- Mock USDC: `0xDf5fA05Eb22B2B68a7178d325E3b8b6027F6C0D1`

## Setup

Create `.env` in the repo root:

```
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

Create `server/.env`:

```
DATABASE_URL=postgres://user:password@host:5432/dbname
```

Install dependencies:

```bash
npm install
cd server && npm install
```

## Run

Start the API (creates tables, syncs properties and events, listens on `127.0.0.1:4000`):

```bash
cd server && npm run dev
```

In another terminal, start the UI (`http://127.0.0.1:5173/`). `/api` is proxied to the server:

```bash
npm run dev
```

## Routes

| Path | Source |
| --- | --- |
| `/` | Property list from `GET /api/properties` |
| `/properties/:id` | One property from `GET /api/properties/:id` |
| Connected wallet | Shares and claimable from `GET /api/portfolio/:address` |

The mint button on the page claims 1000 mUSDC on Sepolia for testing.

## Architecture

On startup the API reads each property from the estate contract and writes a snapshot to Postgres. It then scans logs from the deploy block and stores `Invested`, `FundingFinalized`, `RevenueDeposited`, `RevenueClaimed`, and `Refunded`. The UI never talks to the chain for listings or holdings: it reads `/api/properties`, `/api/properties/:id`, and `/api/portfolio/:address`. Writes still go through the wallet: approve Mock USDC, then `invest`, `claimRevenue`, or `refund`.

```mermaid
flowchart LR
  wallet["Wallet on Sepolia"]
  ui["Vite UI"]
  api["Express API"]
  db[("Postgres")]
  chain["Estate and Mock USDC"]

  wallet -->|"approve, invest, claim, refund"| chain
  ui -->|"wagmi writes"| wallet
  ui -->|"GET /api/*"| api
  api -->|"property snapshot"| db
  api -->|"event logs"| db
  api -->|"eth_call and getLogs"| chain
  api -->|"list, detail, portfolio"| ui
```

Property lifecycle on the contract:

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Funding: startFunding
  Draft --> Cancelled: cancelFunding
  Funding --> Cancelled: cancelFunding
  Funding --> Funded: finalizeFunding
  Funded --> Closed: closeProperty
```

Buy path on the detail page. Funding is required; property #1 is already Funded, so the button stays disabled until a later listing is opened.

```mermaid
sequenceDiagram
  participant User
  participant UI
  participant Wallet
  participant USDC as Mock USDC
  participant Estate
  participant API
  participant DB as Postgres

  User->>UI: Buy shares
  UI->>Wallet: approve cost
  Wallet->>USDC: approve estate
  UI->>Wallet: invest propertyId shares
  Wallet->>Estate: invest
  Estate-->>DB: Invested log via API sync
  UI->>API: GET /api/portfolio/address
  API->>DB: sum Invested minus Refunded
  API-->>UI: shares and claimable
```

GitHub renders these diagrams in the README. For LinkedIn, open the repo file and screenshot one chart, or paste the mermaid into [mermaid.live](https://mermaid.live) and export a PNG.
