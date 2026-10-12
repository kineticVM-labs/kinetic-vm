import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://testnet.monadscan.com" },
  },
});

export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://monadscan.com" },
  },
});

/** ERC-8004 identity registry. The owner approves the attestor here. */
export const IDENTITY: Record<number, `0x${string}`> = {
  10143: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  143: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
};

/** ERC-8004 validation registry. Attestations are read back from here. */
export const VALIDATION: Record<number, `0x${string}`> = {
  10143: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272",
  143: "0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58",
};

/** Kinetic attestor on chains where it is deployed. It is the only accepted validator. */
export const ATTESTOR: Record<number, `0x${string}`> = {
  10143: "0x6e46d149b7d3396b42e874765cf5a1bb26bd5ba5",
};

export const MARKET_CHAIN_ID = 10143;

/** Published KineticVM contracts. A plain transfer to the vault is rejected. */
export const KINETIC: Record<number, { registry: `0x${string}`; vault: `0x${string}` }> = {
  10143: {
    registry: "0xa361931269F7e0b1957175a48669F14735E61EDA",
    vault: "0x77102fCAC7927bB64507DF82bf1ae659465B4EE5",
  },
};

function explorerBase(chainId: number): string | null {
  if (chainId === 10143) return monadTestnet.blockExplorers.default.url;
  if (chainId === 143) return monadMainnet.blockExplorers.default.url;
  return null;
}

export function explorerTx(chainId: number, hash: string): string | null {
  const base = explorerBase(chainId);
  return base ? `${base}/tx/${hash}` : null;
}

export function explorerAddress(chainId: number, address: string): string | null {
  const base = explorerBase(chainId);
  return base ? `${base}/address/${address}` : null;
}

export function explorerNft(chainId: number, contract: string, tokenId: string): string | null {
  const base = explorerBase(chainId);
  return base ? `${base}/token/${contract}/instance/${tokenId}` : null;
}

export function chainName(chainId: number): string {
  if (chainId === 10143) return monadTestnet.name;
  if (chainId === 143) return monadMainnet.name;
  return `Chain ${chainId}`;
}
