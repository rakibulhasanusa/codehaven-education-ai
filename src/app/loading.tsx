export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <section className="premium-panel space-y-4 rounded-2xl p-5 md:p-6">
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        <div className="h-8 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="premium-panel space-y-4 rounded-2xl p-5 md:p-6">
          <div className="h-5 w-56 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        </div>

        <aside className="premium-panel space-y-3 rounded-2xl p-5 md:p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-20 animate-pulse rounded-xl border bg-background/70" />
          <div className="h-20 animate-pulse rounded-xl border bg-background/70" />
          <div className="h-20 animate-pulse rounded-xl border bg-background/70" />
        </aside>
      </section>
    </main>
  );
}
