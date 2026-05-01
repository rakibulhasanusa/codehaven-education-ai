"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-10 md:px-8">
      <section className="premium-panel w-full rounded-2xl p-8 text-center md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Something Went Wrong</p>
        <h1 className="premium-title mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          We hit an unexpected error
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Please try again. If the issue continues, refresh the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md border bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Try Again
        </button>
      </section>
    </main>
  );
}
