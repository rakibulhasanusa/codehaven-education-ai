import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      <Card>
        <CardHeader className="space-y-4">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
      </Card>

      <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="space-y-4 pt-5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
