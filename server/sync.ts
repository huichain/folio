import { createPublicClient,formatUnits,http } from "viem"
import { sepolia } from "viem/chains"
import { abi } from "./abi.ts"
import { initDb, saveProperty } from "./db.ts"
import { Pool } from "pg"

const estate = "0x54574F15f751Ef56B6cE556c6D20a5D39bc4013f" as const
const states = ["Draft", "Funding", "Funded", "Cancelled", "Closed"]
const client = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
})

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const DEPLOY_BLOCK = 11_366_661n
const LOG_CHUNK = 49_999n
const events = abi.filter((item) => item.type === "event")


export type ChainEventInput = {
  blockNumber: bigint
  txHash: string
  logIndex: number
  eventName: string
  propertyId: string
  account: string | null
  shares: string | null
  amount: string | null
}

export async function saveChainEvent(event: ChainEventInput) {
  await pool.query(
      `INSERT INTO chain_events (
          block_number, tx_hash, log_index, event_name, property_id, account, shares, amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [
          event.blockNumber.toString(),
          event.txHash,
          event.logIndex,
          event.eventName,
          event.propertyId,
          event.account,
          event.shares,
          event.amount,
      ],
  )
}

export async function getSyncCursor() {
  const result = await pool.query<{ last_block: string }>(
      `SELECT last_block FROM sync_cursor WHERE id = 1`,
  )
  const last = result.rows[0]?.last_block
  return last === undefined ? null : BigInt(last)
}

export async function setSyncCursor(lastBlock: bigint) {
  await pool.query(
      `INSERT INTO sync_cursor (id, last_block) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET last_block = EXCLUDED.last_block`,
      [lastBlock.toString()],
  )
}

export async function syncProperties() {
  const nextId = await client.readContract({
    address: estate,
    abi,
    functionName: "nextPropertyId",
  })
  for (let id = 1n; id < nextId; id++) {
    const property = await client.readContract({
      address: estate,
      abi,
      functionName: "getProperty",
      args: [id],
    })
    await saveProperty({
      id: id.toString(),
      totalShares: property.totalShares.toString(),
      sharePrice: formatUnits(property.sharePrice, 6),
      soldShares: property.soldShares.toString(),
      raisedAmount: formatUnits(property.raisedAmount, 6),
      state: states[property.state] ?? "Unknown",
    })
  }
  console.log(`synced properties before id ${nextId}`)
}

export async function syncInitDb() {
    await initDb()
}


export async function syncEvents() {
  const head = await client.getBlockNumber()
  const cursor = await getSyncCursor()
  let from = cursor === null ? DEPLOY_BLOCK : cursor + 1n
  if (from > head) return
  while (from <= head) {
      const to = from + LOG_CHUNK - 1n > head ? head : from + LOG_CHUNK - 1n
      const logs = await client.getLogs({
          address: estate,
          events,
          fromBlock: from,
          toBlock: to,
      })
      for (const log of logs) {
          if (log.removed || log.blockNumber === null) continue
          const { propertyId } = log.args
          if (propertyId === undefined) continue
          if (log.eventName === "Invested") {
              const { investor, shares, amount } = log.args
              if (investor === undefined || shares === undefined || amount === undefined) continue
              await saveChainEvent({
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                  logIndex: log.logIndex,
                  eventName: log.eventName,
                  propertyId: propertyId.toString(),
                  account: investor.toLowerCase(),
                  shares: shares.toString(),
                  amount: amount.toString(),
              })
          } else if (log.eventName === "FundingFinalized") {
              const { principalAmount } = log.args
              if (principalAmount === undefined) continue
              await saveChainEvent({
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                  logIndex: log.logIndex,
                  eventName: log.eventName,
                  propertyId: propertyId.toString(),
                  account: null,
                  shares: null,
                  amount: principalAmount.toString(),
              })
          } else if (log.eventName === "RevenueDeposited") {
              const { depositor, amount } = log.args
              if (depositor === undefined || amount === undefined) continue
              await saveChainEvent({
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                  logIndex: log.logIndex,
                  eventName: log.eventName,
                  propertyId: propertyId.toString(),
                  account: depositor.toLowerCase(),
                  shares: null,
                  amount: amount.toString(),
              })
          } else if (log.eventName === "RevenueClaimed" || log.eventName === "Refunded") {
              const { investor, amount } = log.args
              if (investor === undefined || amount === undefined) continue
              await saveChainEvent({
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                  logIndex: log.logIndex,
                  eventName: log.eventName,
                  propertyId: propertyId.toString(),
                  account: investor.toLowerCase(),
                  shares: null,
                  amount: amount.toString(),
              })
          }
      }
      await setSyncCursor(to)
      from = to + 1n
  }
  console.log(`synced events through block ${head}`)
}
