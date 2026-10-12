"use client";

import { useConnect, useConnection, useConnectors, useDisconnect, type Connector } from "wagmi";

import { WalletPill } from "@/components/wallet-pill";

export function ConnectWallet() {
  const connection = useConnection();
  const connectors = useConnectors();
  const { connectAsync, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const connected = connection.status === "connected";

  async function connect(connector: Connector) {
    if (connected && connection.connector.id !== connector.id) await disconnectAsync();
    await connectAsync({ connector });
  }

  return (
    <WalletPill
      address={connected ? connection.address : undefined}
      connectors={connectors}
      currentId={connected ? connection.connector.id : undefined}
      connecting={isPending}
      locked={false}
      onConnect={connect}
      onDisconnect={() => disconnectAsync()}
    />
  );
}
