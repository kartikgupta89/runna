"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getUser, getActivePlan, getFitnessTests } from "@/lib/db/repository";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { UnitsToggle } from "@/components/settings/UnitsToggle";
import { DangerZone } from "@/components/settings/DangerZone";
import { FitnessTestList } from "@/components/settings/FitnessTestList";
import { StravaConnect } from "@/components/settings/StravaConnect";

export default function SettingsPage() {
  const user = useLiveQuery(() => getUser(), [], null);
  const plan = useLiveQuery(() => getActivePlan(), [], null);
  const fitnessTests = useLiveQuery(() => getFitnessTests(), [], null);

  if (user === null || plan === null || fitnessTests === null) return null;
  if (!user) return null;

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3 border-b">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="divide-y">
        <Section title="Profile">
          <ProfileForm user={user} />
        </Section>

        <Section title="Units">
          <UnitsToggle current={user.preferredUnits} />
        </Section>

        <Section title="Strava">
          <StravaConnect user={user} />
        </Section>

        {fitnessTests.length > 0 && (
          <Section title="Fitness tests">
            <FitnessTestList tests={fitnessTests} />
          </Section>
        )}

        <Section title="Danger zone">
          <DangerZone plan={plan ?? undefined} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}
