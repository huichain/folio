export const usdcAddress =
    "0xDf5fA05Eb22B2B68a7178d325E3b8b6027F6C0D1" as const

export const usdcAbi = [
    {
        type:"function",
        name:"mint",
        stateMutability:"nonpayable",
        inputs:[
            {name:"to",type:"address"},
            {name:"amount",type:"uint256"},
        ],
        outputs:[],
    },
    {
        type:"function",
        name:"balanceOf",
        stateMutability:"view",
        inputs:[{name :"amount",type:"address"}],
        outputs:[{name:"",type:"uint256"}],
    },
] as const