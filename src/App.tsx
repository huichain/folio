import { useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi"
import { formatUnits, parseUnits } from "viem"
import { sepolia } from "viem/chains"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes, useParams } from "react-router-dom"
import { abi } from "./abi"
import { estateAddress } from "./wagmi"
import { usdcAbi, usdcAddress } from "./usdc"

export type Property = {
  id: string
  totalShares: string
  sharePrice: string
  soldShares: string
  raisedAmount: string
  state: string
}

type Portfolio = {
  shares: string
  claimable: string
  positions: {
    propertyId: string
    shares: string
    claimable: string
  }[]
}

function PropertyDetail() {
  const { id } = useParams()
  const { address } = useAccount()
  const portfolio = useQuery({
    queryKey: ["portfolio", address],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/${address}`)
      if (!response.ok)
        throw new Error("Failed to load portfolio")
      return (await response.json()) as Portfolio
    },
    enabled: Boolean(address)
  })
  const position = portfolio.data?.positions.find((item) => item.propertyId === id)

  const property = useQuery(
    {
      queryKey: ["property", id],
      queryFn: async () => {
        const response = await fetch(`/api/properties/${id}`)
        if (response.status === 404)
          throw new Error("Property not found")
        if (!response.ok)
          throw new Error("Failed to load properties")
        return (await response.json()) as Property
      },
      enabled: Boolean(id),
    }
  )

  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const [shareCount, setShareCount] = useState("1")
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const whitelisted = useReadContract({
    address: estateAddress,
    abi,
    functionName: "whitelisted",
    args: [address!],
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  })
  const sharesToBuy = /^\d+$/.test(shareCount) ? BigInt(shareCount) : 0n
  const canBuy =
    property.data?.state === "Funding" &&
    sharesToBuy > 0n &&
    whitelisted.data === true
  async function buy() {
    if (!address || !publicClient || !property.data || !canBuy) return
    setActionError(null)
    try {
      setBusy("approve")
      const cost = sharesToBuy * parseUnits(property.data.sharePrice, 6)
      const approveHash = await writeContractAsync({
        address: usdcAddress,
        abi: usdcAbi,
        functionName: "approve",
        args: [estateAddress, cost],
        chainId: sepolia.id,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })
      setBusy("invest")
      const investHash = await writeContractAsync({
        address: estateAddress,
        abi,
        functionName: "invest",
        args: [BigInt(property.data.id), sharesToBuy],
        chainId: sepolia.id,
      })
      await publicClient.waitForTransactionReceipt({ hash: investHash })
      await queryClient.invalidateQueries({ queryKey: ["portfolio", address] })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Transaction failed")
    } finally {
      setBusy(null)
    }
  }

  async function send(label: "claim" | "refund", functionName: "claimRevenue" | "refund") {
    if (!address || !publicClient || !property.data) return
    setActionError(null)
    try {
      setBusy(label)
      const hash = await writeContractAsync({
        address: estateAddress,
        abi,
        functionName,
        args: [BigInt(property.data.id)],
        chainId: sepolia.id,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      await queryClient.invalidateQueries({ queryKey: ["portfolio", address] })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Transaction failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <p><Link to="/">Back to list</Link></p>
      {property.isLoading && <p>Loading properties...</p>}
      {property.error && <p>Failed to load:{property.error.message}</p>}
      {property.data && (
        <>
          <h1>Property #{property.data.id}</h1>
          <p>Total shares:{property.data.totalShares}</p>
          <p>Price per share:{property.data.sharePrice}</p>
          <p>Shares sold:{property.data.soldShares}</p>
          <p>Amount raised:{property.data.raisedAmount}</p>
          <p>Status:{property.data.state}</p>
          <p>My shares :{address ? (position?.shares ?? "0") : "Not connected"}</p>
          <p>Claimable :{address ? (position?.claimable ?? "0") : "Not connected"} mUSDC</p>
          <p>
            <label>
              Shares to buy
              <input
                value={shareCount}
                onChange={(event) => setShareCount(event.target.value)}
                inputMode="numeric"
                style={{ marginLeft: 8 }}
              />
            </label>
          </p>
          <button
            type="button"
            disabled={!address || busy !== null || !canBuy}
            onClick={() => void buy()}
          >
            {busy === "approve" || busy === "invest" ? "Waiting for confirmation..." : "Buy"}
          </button>
          {property.data.state !== "Funding" && (
            <p>
              This property is {property.data.state}. The contract rejects new purchases.
              A property still in Funding is required.
            </p>
          )}
          {address && whitelisted.data === false && (
            <p>This wallet is not whitelisted. The contract will reject buy and claim.</p>
          )}
          <p>
            <button
              type="button"
              disabled={!address || busy !== null}
              onClick={() => void send("claim", "claimRevenue")}
            >
              {busy === "claim" ? "Waiting for confirmation..." : "Claim revenue"}
            </button>
          </p>
          {property.data.state === "Cancelled" && (
            <p>
              <button
                type="button"
                disabled={!address || busy !== null}
                onClick={() => void send("refund", "refund")}
              >
                {busy === "refund" ? "Waiting for confirmation..." : "Refund"}
              </button>
            </p>
          )}
          {actionError && <p>Transaction failed: {actionError}</p>}
        </>
      )}
    </section>
  )

}

function App() {
  // Connected wallet address. Undefined when no wallet is connected.
  const { address } = useAccount();
  const Properties = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties")
      if (!response.ok) throw new Error("Failed to load properties")
      return (await response.json()) as Property[]
    }
  })

  const portfolio = useQuery({
    queryKey: ["portfolio", address],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/${address}`)
      if (!response.ok) throw new Error("Failed to load portfolio")
      return (await response.json()) as Portfolio
    },
    enabled: Boolean(address),
  })

  const { writeContract, isPending, error } = useWriteContract()
  const usdcBalance = useReadContract({
    address: usdcAddress,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [address!],
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  })


  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      {/* RainbowKit connect button: shows the address and a disconnect option once connected. */}
      <header style={{ display: "flex", justifyContent: "flex-end" }}>
        <ConnectButton />
      </header>
      <Routes>
        <Route path="/" element={
          <>
            {Properties.isLoading && <p>Loading properties...</p>}
            {Properties.error && <p>Failed to load: {Properties.error.message}</p>}
            {Properties.data?.map((property) => (
              <Link key={property.id} to={`/properties/${property.id}`}>
                <h1>Property #{property.id}</h1>
                <p>Total shares: {property.totalShares}</p>
                <p>Price per share: {property.sharePrice} mUSDC</p>
                <p>Shares sold: {property.soldShares}</p>
                <p>Amount raised: {property.raisedAmount} mUSDC</p>
                <p>Status: {property.state}</p>
              </Link>
            ))}
          </>
        } />
        <Route path="/properties/:id" element={<PropertyDetail />} />
      </Routes>
      <p>
        My shares:{" "}
        {!address && "Not connected"}
        {address && portfolio.isLoading && "Loading..."}
        {address && portfolio.error && portfolio.error.message}
        {address && portfolio.data && portfolio.data.shares}
      </p>
      <p>
        Claimable:{" "}
        {!address && "Not connected"}
        {address && portfolio.isLoading && "Loading..."}
        {address && portfolio.data && `${portfolio.data.claimable} mUSDC`}
      </p>
      <button type="button" disabled={!address || isPending} onClick={() =>
        writeContract(
          {
            address: usdcAddress,
            abi: usdcAbi,
            functionName: "mint",
            args: [address!, 1000n * 10n ** 6n],
            chainId: sepolia.id
          },
          { onSuccess: () => usdcBalance.refetch() },
        )
      }>
        {isPending ? "Waiting for wallet confirmation..." : "Claim 1000 mUSDC"}
      </button>
      {error && <p>Transaction failed: {error.message}</p>}
      <p>
        mUSDC balance:
        {usdcBalance.data !== undefined ?
          formatUnits(usdcBalance.data, 6) : "Not connected"}
      </p>
    </main>
  )

}

export default App
