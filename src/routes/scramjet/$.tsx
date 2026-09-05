import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/scramjet/$")({
  component: ScramjetFallback,
});

function ScramjetFallback() {
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      if (!cancelled && !navigator.serviceWorker.controller) {
        window.location.reload();
      }
    };

    bootstrap().catch((error) => {
      console.error("[v0] Failed to activate Scramjet service worker", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
      <p>Starting proxy…</p>
    </main>
  );
}

