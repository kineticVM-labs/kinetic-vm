import { headers } from "next/headers";

import { Home } from "@/components/home/home";

export default async function Page() {
  const headerList = await headers();
  const host = headerList.get("host")?.split(":")[0] ?? "";
  return <Home host={host} />;
}
