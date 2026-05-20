import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">🏃</p>
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="text-sm text-muted-foreground">
        Looks like you&apos;ve gone off-route.
      </p>
      <Button asChild>
        <Link href="/today">Back to today</Link>
      </Button>
    </div>
  );
}
