"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRow } from "@/lib/db/dexie";

interface ProfileFormProps {
  user: UserRow;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(user.age ? String(user.age) : "");
  const [isPending, setIsPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setIsPending(true);
    try {
      await updateProfile({
        name,
        age: age ? parseInt(age) : undefined,
        preferredUnits: user.preferredUnits,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="profileName">Name</Label>
        <Input
          id="profileName"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profileAge">Age (optional)</Label>
        <Input
          id="profileAge"
          type="number"
          min={10}
          max={99}
          value={age}
          onChange={(e) => { setAge(e.target.value); setSaved(false); }}
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={isPending}
        variant={saved ? "outline" : "default"}
        className="w-full"
      >
        {isPending ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </Button>
    </div>
  );
}
