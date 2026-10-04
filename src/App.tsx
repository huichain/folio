import { ConnectButton, useAddRecentTransaction } from "@rainbow-me/rainbowkit"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { formatUnits } from "viem"
import { sepolia } from "viem/chains"
import { usdcAbi, usdcAddress } from "./usdc"
import { useQuery } from "@tanstack/react-query"
import { Link, Route, Routes, useParams } from "react-router-dom"

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
  const {address} =useAccount()
  const portfolio=useQuery({
    queryKey:["portfolio",address],
    queryFn:async()=>{
      const response=await fetch(`/api/portfolio/${address}`)
      if(!response.ok) 
        throw new Error("Failed to load portfolio")
      return (await response.json()) as Portfolio
    },
    enabled:Boolean(address)
  })
  const position =portfolio.data?.positions.find((item)=>item.propertyId===id)

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
          <p>My shares :{address? (position?.shares?? "0"):"Not connected"}</p>
          <p>Claimable :{address? (position?.claimable??"0"):"Not connected"} mUSDC</p>
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
        {!address&& "Not connected"}
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
