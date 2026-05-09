// Landing page is implemented in a later task; this stub keeps the build green.
import Link from "next/link";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-fg-0">
          OceanX AI — Agent Pipeline
        </h1>
        <p className="mt-3 text-fg-2">
          Scaffolding in progress. Visit{" "}
          <Link href="/dashboard" className="text-accent-0 underline-offset-4 hover:underline">
            /dashboard
          </Link>{" "}
          when ready.
        </p>
      </div>
    </main>
  );
}
