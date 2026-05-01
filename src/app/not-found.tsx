import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-10 md:px-8">
      <section className="premium-panel w-full rounded-2xl p-8 text-center md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="premium-title mt-2 text-3xl font-bold tracking-tight md:text-4xl">Page Not Found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md border bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Go Back Home
        </Link>
      </section>
    </main>
  );
}
