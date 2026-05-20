"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getUser } from "@/lib/db/repository";
import { SetupWizard } from "@/components/setup/SetupWizard";

export default function SetupPage() {
  const router = useRouter();
  const user = useLiveQuery(() => getUser(), [], null);

  useEffect(() => {
    if (user === null) return;
    if (user) router.replace("/today");
  }, [user, router]);

  if (user === null) return null;
  if (user) return null;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Runna</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Build your personalised training plan
        </p>
      </div>
      <SetupWizard />
    </div>
  );
}
