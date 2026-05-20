"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setupUser, type SetupInput } from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

const RACE_OPTIONS = [
  { value: "fivek", label: "5K" },
  { value: "tenk", label: "10K" },
  { value: "halfMarathon", label: "Half Marathon" },
  { value: "marathon", label: "Marathon" },
] as const;

const RACE_DISTANCES_M: Record<string, number> = {
  "5K": 5000,
  "10K": 10000,
  "Half Marathon": 21097.5,
  "Marathon": 42195,
  "Custom": 0,
};

function parseDuration(raw: string): number | null {
  const parts = raw.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

interface FormState {
  name: string;
  age: string;
  preferredUnits: "metric" | "imperial";
  racePreset: string;
  customDistanceKm: string;
  raceTime: string;
  goalRace: string;
  raceDateIso: string;
  daysPerWeek: string;
  currentWeeklyKm: string;
}

const DEFAULTS: FormState = {
  name: "",
  age: "",
  preferredUnits: "metric",
  racePreset: "10K",
  customDistanceKm: "",
  raceTime: "",
  goalRace: "halfMarathon",
  raceDateIso: "",
  daysPerWeek: "4",
  currentWeeklyKm: "",
};

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function validate(): string | null {
    if (step === 1) {
      if (!form.name.trim()) return "Name is required";
    }
    if (step === 2) {
      const distM =
        form.racePreset === "Custom"
          ? parseFloat(form.customDistanceKm) * 1000
          : RACE_DISTANCES_M[form.racePreset];
      if (!distM || distM <= 0) return "Enter a valid distance";
      const timeS = parseDuration(form.raceTime);
      if (!timeS || timeS <= 0) return "Enter time as H:MM:SS or MM:SS";
    }
    if (step === 3) {
      if (!form.goalRace) return "Select a goal race";
    }
    if (step === 4) {
      if (!form.raceDateIso) return "Select your race date";
      if (new Date(form.raceDateIso) <= new Date()) return "Race date must be in the future";
      const days = parseInt(form.daysPerWeek);
      if (isNaN(days) || days < 3 || days > 6) return "Days per week must be between 3 and 6";
    }
    return null;
  }

  function next() {
    const err = validate();
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  }

  function back() {
    setError(null);
    setStep((s) => s - 1);
  }

  async function submit() {
    const err = validate();
    if (err) { setError(err); return; }

    const distM =
      form.racePreset === "Custom"
        ? parseFloat(form.customDistanceKm) * 1000
        : RACE_DISTANCES_M[form.racePreset];
    const timeS = parseDuration(form.raceTime)!;

    const input: SetupInput = {
      name: form.name.trim(),
      age: form.age ? parseInt(form.age) : undefined,
      preferredUnits: form.preferredUnits,
      recentRaceDistanceM: distM,
      recentRaceTimeS: timeS,
      goalRace: form.goalRace as SetupInput["goalRace"],
      raceDateIso: form.raceDateIso,
      daysPerWeek: parseInt(form.daysPerWeek),
      currentWeeklyKm: form.currentWeeklyKm ? parseFloat(form.currentWeeklyKm) : undefined,
    };

    setIsPending(true);
    try {
      await setupUser(input);
      router.push("/today");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i + 1 <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <div className="space-y-4 min-h-[220px]">
        {step === 1 && <Step1 form={form} set={set} />}
        {step === 2 && <Step2 form={form} set={set} />}
        {step === 3 && <Step3 form={form} set={set} />}
        {step === 4 && <Step4 form={form} set={set} />}
        {step === 5 && <Step5 form={form} />}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={back} disabled={isPending} className="flex-1">
            Back
          </Button>
        )}
        {step < TOTAL_STEPS ? (
          <Button onClick={next} className="flex-1">Continue</Button>
        ) : (
          <Button onClick={submit} disabled={isPending} className="flex-1">
            {isPending ? "Building plan…" : "Generate My Plan"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Step1({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">About you</h2>
        <p className="text-muted-foreground text-sm">Help us personalise your experience</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Your name" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age">Age (optional)</Label>
          <Input id="age" type="number" placeholder="e.g. 32" min={10} max={99} value={form.age} onChange={(e) => set("age", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred units</Label>
          <Select value={form.preferredUnits} onValueChange={(v) => set("preferredUnits", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">Metric (km)</SelectItem>
              <SelectItem value="imperial">Imperial (miles)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function Step2({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Recent performance</h2>
        <p className="text-muted-foreground text-sm">A recent race or time trial used to calculate your VDOT fitness score</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Race distance</Label>
          <Select value={form.racePreset} onValueChange={(v) => set("racePreset", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(RACE_DISTANCES_M).map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.racePreset === "Custom" && (
          <div className="space-y-1.5">
            <Label htmlFor="customDist">Distance (km)</Label>
            <Input id="customDist" type="number" step="0.1" placeholder="e.g. 8.5" value={form.customDistanceKm} onChange={(e) => set("customDistanceKm", e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="raceTime">Finish time (H:MM:SS or MM:SS)</Label>
          <Input id="raceTime" placeholder="e.g. 55:30" value={form.raceTime} onChange={(e) => set("raceTime", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function Step3({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Goal race</h2>
        <p className="text-muted-foreground text-sm">What are you training towards?</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {RACE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => set("goalRace", value)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              form.goalRace === value ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/50 hover:bg-muted/50",
            )}
          >
            <span className="font-semibold text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step4({ form, set }: { form: FormState; set: (k: keyof FormState, v: string) => void }) {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 56);
  const minIso = minDate.toISOString().split("T")[0];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Plan details</h2>
        <p className="text-muted-foreground text-sm">When is your race and how often can you train?</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="raceDate">Race date</Label>
          <Input id="raceDate" type="date" min={minIso} value={form.raceDateIso} onChange={(e) => set("raceDateIso", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Days per week</Label>
          <Select value={form.daysPerWeek} onValueChange={(v) => set("daysPerWeek", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[3, 4, 5, 6].map((d) => <SelectItem key={d} value={String(d)}>{d} days/week</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currentKm">Current weekly {form.preferredUnits === "imperial" ? "mileage (miles, optional)" : "km (optional)"}</Label>
          <Input id="currentKm" type="number" step="1" placeholder="e.g. 40" value={form.currentWeeklyKm} onChange={(e) => set("currentWeeklyKm", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function Step5({ form }: { form: FormState }) {
  const goalLabel = RACE_OPTIONS.find((r) => r.value === form.goalRace)?.label ?? form.goalRace;
  const distLabel = form.racePreset === "Custom" ? `${form.customDistanceKm} km` : form.racePreset;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Ready to build your plan</h2>
        <p className="text-muted-foreground text-sm">Here&apos;s what we have</p>
      </div>
      <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
        <Row label="Name" value={form.name} />
        <Row label="Units" value={form.preferredUnits === "metric" ? "Metric (km)" : "Imperial (miles)"} />
        <Row label="Recent race" value={`${distLabel} in ${form.raceTime}`} />
        <Row label="Goal" value={goalLabel} />
        <Row label="Race date" value={form.raceDateIso} />
        <Row label="Days/week" value={form.daysPerWeek} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
