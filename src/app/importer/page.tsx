import { Suspense } from "react";
import ImporterClient from "./ImporterClient";

export default function ImporterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading importer…</p>
        </main>
      }
    >
      <ImporterClient />
    </Suspense>
  );
}