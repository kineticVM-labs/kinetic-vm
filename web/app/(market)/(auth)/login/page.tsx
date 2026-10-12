import { redirect } from "next/navigation";

export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  const mode = one(query.mode);
  const next = one(query.next);
  if (mode) params.set("mode", mode);
  if (next) params.set("next", next);
  const suffix = params.toString();
  redirect(suffix ? `/marketplace/login?${suffix}` : "/marketplace/login");
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
