import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import "@rainbow-me/rainbowkit/styles.css"
import './index.css'
import App from './App.tsx'
import { config } from "./wagmi.ts"
import { BrowserRouter } from 'react-router-dom'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>

      <QueryClientProvider client={queryClient}>

        <RainbowKitProvider locale="en-US">
          
            <BrowserRouter>

                <App />

            </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,  
)
