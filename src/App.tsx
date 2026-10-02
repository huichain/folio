import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { formatUnits } from "viem"
import { sepolia } from "viem/chains"
import { abi } from "./abi"
import { estateAddress } from "./wagmi"
import { usdcAbi, usdcAddress } from "./usdc"
import { useQuery } from "@tanstack/react-query"

type Property = {
  id: string
  totalShares: string
  sharePrice: string
  soldShares: string
  raisedAmount: string
  state: string
}

function App() {
  // 当前连接的钱包地址。没连接时是 undefined。
  const { address } = useAccount();
  const Properties = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties")
      if (!response.ok) throw new Error("加载房产失败")
      return (await response.json()) as Property[]
    }
  })


  // 读 Sepolia 上房产 #1 的公开数据。view 调用，不需要签名，也不花 gas。
  // propertyId 用 1n：合约参数是 uint256，wagmi 这里要传 bigint。
  // const property = useReadContract({
  //   address: estateAddress,
  //   abi,
  //   functionName: "getProperty",
  //   args: [1n],
  //   chainId: sepolia.id,
  // })

  const { writeContract, isPending, error } = useWriteContract()
  const usdcBalance = useReadContract({
    address: usdcAddress,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [address!],
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  })


  // 读当前钱包在房产 #1 上的 ERC-1155 份额。
  // 没连接钱包时 address 为空，不能拿去当 account，所以用 enabled 关掉这次查询。
  const shares = useReadContract({
    address: estateAddress,
    abi,
    functionName: "balanceOf",
    args: [address!, 1n],
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  })

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      {/* RainbowKit 的连接按钮：连上后会显示地址和断开入口。 */}
      <header style={{ display: "flex", justifyContent: "flex-end" }}>
        <ConnectButton />
      </header>
      {Properties.isLoading && <p>读取房产中...</p>}
      {Properties.error && <p>读取失败：{Properties.error.message}</p>}
      {Properties.data?.map((property) => (
        <section key={property.id}>
          <h1>房产 #{property.id}</h1>
          <p>总份额：{property.totalShares}</p>
          <p>每股价格：{property.sharePrice} mUSDC</p>
          <p>已售份额：{property.soldShares}</p>
          <p>已募集：{property.raisedAmount} mUSDC</p>
          <p>状态：{property.state}</p>
        </section>
      ))}
      <p>
        我的份额:
        {/* shares.data 是 bigint。undefined 表示查询还没跑（通常是还没连钱包）。 */}
        {shares.data !== undefined ? shares.data.toString() : "未连接"}
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
        {isPending ? "等待钱包确认..." : "领取 1000 mUSDC"}
      </button>
      {error && <p>交易失败:{error.message}</p>}
      <p>
        mUSDC 余额:
        {usdcBalance.data !== undefined ?
          formatUnits(usdcBalance.data, 6) : "未连接"}
      </p>
    </main>
  )

}

export default App
