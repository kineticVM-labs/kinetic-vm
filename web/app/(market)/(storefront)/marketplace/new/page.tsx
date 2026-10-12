import { redirect } from "next/navigation";

export default function LegacyNewListingPage() {
  redirect("/account/listings/new");
}
