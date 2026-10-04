import { loadEnvFile } from "node:process"
import pg from "pg"
import { mapProtocol } from "viem/chains"

loadEnvFile()

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
})

export type PropertyRow = {
    id: string
    totalShares: string
    sharePrice: string
    soldShares: string
    raisedAmount: string
    state: string
}

export async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS properties (
            id text PRIMARY KEY,
            total_shares text NOT NULL,
            share_price text NOT NULL,
            sold_shares text NOT NULL,
            raised_amount text NOT NULL,
            state text NOT NULL
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS chain_events(
            block_number bigint NOT NULL,
            tx_hash text NOT NULL,
            log_index integer NOT NULL,
            event_name text NOT NULL,
            property_id text NOT NULL,
            account text,
            shares text,
            amount text,
            PRIMARY KEY (tx_hash,log_index)
        )
        
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sync_cursor(
            id integer PRIMARY KEY,
            last_block bigint NOT NULL
        )
    
    `)

}

export async function saveProperty(property: PropertyRow) {
    await pool.query(
        `INSERT INTO properties (
        id, total_shares, share_price, sold_shares, raised_amount, state
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
            total_shares = EXCLUDED.total_shares,
            share_price = EXCLUDED.share_price,
            sold_shares = EXCLUDED.sold_shares,
            raised_amount = EXCLUDED.raised_amount,
            state = EXCLUDED.state`,
        [
            property.id,
            property.totalShares,
            property.sharePrice,
            property.soldShares,
            property.raisedAmount,
            property.state,
        ],
    )

}

export async function listProperties() {
    const result = await pool.query<PropertyRow>(`
        SELECT
            id,
            total_shares AS "totalShares",
            share_price AS "sharePrice",
            sold_shares AS "soldShares",
            raised_amount AS "raisedAmount",
            state
        FROM properties
        ORDER BY id::bigint
        `)
    return result.rows
}


export async function getProperty(id: string) {
    const result = await pool.query<PropertyRow>(`
        SELECT
            id,
            total_shares AS "totalShares",
            share_price AS "sharePrice",
            sold_shares AS "soldShares",
            raised_amount AS "raisedAmount",
            state
        FROM properties
        WHERE id = $1
        
        `, [id])
    return result.rows[0] ?? null
}

const REWARD_PRECISION = 10n ** 24n

function formatToken(amount: bigint, decimals = 6) {
    const scale = 10n ** BigInt(decimals)
    const whole = amount / scale
    const fraction = (amount % scale).toString().padStart(6, "0").replace(/0+$/, "")
    return fraction === "" ? whole.toString() : `${whole}.${fraction}`
}

export async function getPortfolio(address: string) {
    const account = address.toLowerCase()
    const result = await pool.query<{
        event_name: string
        property_id: string
        account: string | null
        shares: string | null
        amount: string | null
    }>(`
            SELECT event_name,property_id,account,shares,amount
            FROM chain_events
            ORDER BY block_number,log_index    
    `)

    const supply = new Map<string, bigint>()
    const revenuePerShare = new Map<string, bigint>()
    const shares = new Map<string, bigint>()
    const claimed = new Map<string, bigint>()

    for (const event of result.rows) {
        if (event.event_name === "Invested") {
            const bought = BigInt(event.shares ?? "0")
            supply.set(event.property_id, (supply.get(event.property_id) ?? 0n) + bought)
            if (event.account === account) {
                shares.set(event.property_id, (shares.get(event.property_id) ?? 0n) + bought)
            }
        }
        if (event.event_name === "Refunded" && event.account === account) {
            shares.set(event.property_id, 0n)
        }
        if (event.event_name === "RevenueDeposited") {
            const outstanding = supply.get(event.property_id) ?? 0n
            if (outstanding === 0n)
                continue
            const next = (revenuePerShare.get(event.property_id) ?? 0n) + (BigInt(event.amount ?? "0") * REWARD_PRECISION) / outstanding
            revenuePerShare.set(event.property_id, next)
        }
        if (event.event_name === "RevenueClaimed" && event.account === account) {
            claimed.set(event.property_id, (claimed.get(event.property_id) ?? 0n) + BigInt(event.amount ?? "0"))
        }
    }

    const positions = []
    let totalShares = 0n
    let totalClaimable = 0n
    for (const [propertyId, held] of shares) {
        if (held === 0n) continue
        const accrued = held * (revenuePerShare.get(propertyId) ?? 0n) / REWARD_PRECISION
        const alreadyClaimed = claimed.get(propertyId) ?? 0n
        const claimable = accrued > alreadyClaimed ? accrued - alreadyClaimed : 0n
        totalShares += held
        totalClaimable += claimable
        positions.push({
            propertyId,
            shares: held.toString(),
            claimable: formatToken(claimable),
        })
    }

    return {
        shares:totalShares.toString(),
        claimable:formatToken(totalClaimable),
        positions,
    }
}