import express from "express"
import cors from "cors"
import { listProperties, getProperty, getPortfolio } from "./db.ts"
import { syncEvents, syncInitDb, syncProperties } from "./sync.ts"
import { isAddress } from "viem"

const app = express()
app.use(cors())

app.get("/api/properties", async (_req, res) => {
    res.json(await listProperties())
})

app.get("/api/properties/:id", async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const property = await getProperty(id)
    if (!property) {
        res.status(404).json({ error: "Property not found" })
        return

    }
    res.json(property)
})

app.get("/api/portfolio/:address",async(req,res)=>{
    const address =Array.isArray(req.params.address)? req.params.address[0] :req.params.address
    if(!isAddress(address)){
        res.status(400).json({ error: "Invalid wallet address" })
        return
    }
    res.json(await getPortfolio(address))
})

async function main() {
    await syncInitDb()
    await syncProperties()
    await syncEvents()
    app.listen(4000, "127.0.0.1", () => {
        console.log("API http://127.0.0.1:4000")
    })

}

main()
