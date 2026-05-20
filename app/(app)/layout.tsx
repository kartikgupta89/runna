"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getUser } from "@/lib/db/repository";
import { BottomNav } from "@/components/nav/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useLiveQuery(() => getUser(), [], null);

  useEffect(() => {
    if (user === null) return;
    if (!user) router.replace("/setup");
  }, [user, router]);

  if (user === null || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20 max-w-lg mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
