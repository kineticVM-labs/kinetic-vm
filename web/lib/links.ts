export const links = {
  docs: "https://docs.kineticvm.xyz",
  marketplace: "https://marketplace.kineticvm.xyz",
  github: "https://github.com/kineticVM-labs/kinetic-vm",
  x: "https://x.com/kineticvm",
} as const;

export function homeHref(host: string): string {
  if (host.startsWith("claim.") || host.startsWith("vault-deposit.")) return "https://kineticvm.xyz";
  return "/";
}

export function claimHref(host: string): string {
  if (host === "kineticvm.xyz" || host === "www.kineticvm.xyz") {
    return "https://claim.kineticvm.xyz";
  }
  return "/claim";
}
