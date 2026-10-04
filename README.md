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
