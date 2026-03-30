import Link from "next/link";

import { JoinClient } from "@/components/household/JoinClient";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm font-semibold text-fuchsia-700 hover:underline">
          ← Bloom
        </Link>
      </div>
      <JoinClient initialToken={sp.token ?? ""} />
    </div>
  );
}
