import express from "express"
import cors from "cors"
import { createPublicClient, formatUnits, http } from "viem"
import { sepolia } from "viem/chains"
import { abi } from "./abi.ts"

const estate = "0x54574F15f751Ef56B6cE556c6D20a5D39bc4013f" as const
const states = ["Draft", "Funding", "Funded", "Cancelled", "Closed"]

const client = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
})

const app = express()
app.use(cors())

app.get("/api/properties", async (_req, res) => {
    const nextId = await client.readContract({
        address: estate,
        abi,
        functionName: "nextPropertyId"
    })

    const properties = []
    for (let id = 1n; id < nextId; id++) {
        const property  = await client.readContract({
            address: estate,
            abi,
            functionName: "getProperty",
            args: [id],

        })
        properties.push({
            id: id.toString(),
            totalShares: property.totalShares.toString(),
            sharePrice: formatUnits(property.sharePrice, 6),
            soldShares: property.soldShares.toString(),
            raisedAmount: formatUnits(property.raisedAmount, 6),
            state: states[property.state]
        })
    }

    res.json(properties)
})

app.listen(4000, "127.0.0.1", () => {
    console.log("API http://127.0.0.1:4000")
})
