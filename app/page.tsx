"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getUser } from "@/lib/db/repository";

export default function Home() {
  const router = useRouter();
  const user = useLiveQuery(() => getUser(), [], null);

  useEffect(() => {
    if (user === null) return;
    if (user) router.replace("/today");
    else router.replace("/setup");
  }, [user, router]);

  return null;
}
