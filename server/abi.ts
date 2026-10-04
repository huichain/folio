export const abi = [
    {
      type: "function",
      name: "nextPropertyId",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      type: "function",
      name: "getProperty",
      stateMutability: "view",
      inputs: [{ name: "propertyId", type: "uint256" }],
      outputs: [
        {
          name: "",
          type: "tuple",
          components: [
            { name: "totalShares", type: "uint256" },
            { name: "sharePrice", type: "uint256" },
            { name: "fundingTarget", type: "uint256" },
            { name: "minInvestment", type: "uint256" },
            { name: "maxInvestment", type: "uint256" },
            { name: "fundingDeadline", type: "uint256" },
            { name: "soldShares", type: "uint256" },
            { name: "raisedAmount", type: "uint256" },
            { name: "revenueDeposited", type: "uint256" },
            { name: "state", type: "uint8" },
            { name: "paused", type: "bool" },
            { name: "metadataURI", type: "string" },
          ],
        },
      ],
    },
    {
      type: "event",
      name: "Invested",
      inputs: [
        { name: "propertyId", type: "uint256", indexed: true },
        { name: "investor", type: "address", indexed: true },
        { name: "shares", type: "uint256", indexed: false },
        { name: "amount", type: "uint256", indexed: false },
      ],
    },
    {
      type: "event",
      name: "FundingFinalized",
      inputs: [
        { name: "propertyId", type: "uint256", indexed: true },
        { name: "principalAmount", type: "uint256", indexed: false },
      ],
    },
    {
      type: "event",
      name: "RevenueDeposited",
      inputs: [
        { name: "propertyId", type: "uint256", indexed: true },
        { name: "depositor", type: "address", indexed: true },
        { name: "amount", type: "uint256", indexed: false },
      ],
    },
    {
      type: "event",
      name: "RevenueClaimed",
      inputs: [
        { name: "propertyId", type: "uint256", indexed: true },
        { name: "investor", type: "address", indexed: true },
        { name: "amount", type: "uint256", indexed: false },
      ],
    },
    {
      type: "event",
      name: "Refunded",
      inputs: [
        { name: "propertyId", type: "uint256", indexed: true },
        { name: "investor", type: "address", indexed: true },
        { name: "amount", type: "uint256", indexed: false },
      ],
    },
  ] as const
