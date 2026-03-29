import { JoinClient } from "@/components/household/JoinClient";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  return <JoinClient initialToken={sp.token ?? ""} />;
}
