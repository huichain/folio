import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {http} from "wagmi";
import { sepolia } from "viem/chains";

const projectId  =import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
if (!projectId ){
    throw new Error("Missing VITE_WALLETCONNECT_PROJECT_ID")
}

export const estateAddress =  "0x54574F15f751Ef56B6cE556c6D20a5D39bc4013f" as const

export const config = getDefaultConfig({
    appName:"Folio",
    projectId ,
    chains:[sepolia],
    transports:{
        [sepolia.id]:http("https://ethereum-sepolia-rpc.publicnode.com")
    },
    ssr:false,

})