export const MACHINE_TYPES = [
  { id: "vending", label: "Vending" },
  { id: "arm", label: "Robot arm" },
  { id: "drone", label: "Drone" },
  { id: "amr", label: "Mobile robot" },
  { id: "sensor", label: "Sensor" },
  { id: "humanoid", label: "Humanoid" },
  { id: "other", label: "Other" },
] as const;

export const LICENSES = [
  {
    id: "research",
    label: "Research",
    detail: "Train and evaluate models. The raw file cannot be resold.",
  },
  {
    id: "commercial",
    label: "Commercial training",
    detail: "Train products you ship. The raw file cannot be resold.",
  },
  {
    id: "audit",
    label: "Audit",
    detail: "Review the records. They cannot be used to train a model.",
  },
] as const;

export type MachineType = (typeof MACHINE_TYPES)[number]["id"];
export type LicenseId = (typeof LICENSES)[number]["id"];

export function machineLabel(id: string): string {
  return MACHINE_TYPES.find((item) => item.id === id)?.label ?? id;
}

export function licenseLabel(id: string): string {
  return LICENSES.find((item) => item.id === id)?.label ?? id;
}

export function licenseDetail(id: string): string {
  return LICENSES.find((item) => item.id === id)?.detail ?? "";
}

export type PublicListing = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  machineType: MachineType;
  license: LicenseId;
  priceWei: string;
  payout: `0x${string}`;
  agentId: string;
  chainId: number;
  seller: string;
  /** Public cover. Empty when the seller did not set one. */
  image: string | null;
  /** Filled catalog rows so the marketplace can be reviewed before real uploads. */
  preview?: boolean;
  rowCount: number;
  schema: string[];
  createdAt: number;
};

export type ListingAccess = {
  dataCid: string;
  manifestCid: string;
  dataUrl: string;
  manifestUrl: string;
};

export type DatasetMeta = {
  chainId: number;
  agentId: string;
  title: string;
  summary: string;
  description: string;
  machineType: MachineType;
  license: LicenseId;
  priceWei: bigint;
  payout: `0x${string}`;
};
