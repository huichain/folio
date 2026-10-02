export const abi = [
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
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [
        { name: "account", type: "address" },
        { name: "id", type: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const