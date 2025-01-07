import { type Chain } from "viem";

export const lenssepolia: Chain = {
  id: 37111,
  name: "Lens Network Sepolia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Grass",
    symbol: "GRASS",
  },
  rpcUrls: {
    default: {
      http: [
        `https://lens-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "LensDev",
      url: "https://block-explorer.testnet.lens.dev",
    },
  },
  testnet: true,
};
