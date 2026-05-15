"use client";

import PublicFooter from "@/components/navbars/public-footer";
import PublicNavbar from "@/components/navbars/public-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-10 md:px-8">
        <Card className="w-full text-center">
          <CardHeader>
            <p className="premium-kicker">Something Went Wrong</p>
            <CardTitle className="premium-title text-3xl font-bold tracking-tight md:text-4xl">
              We hit an unexpected error
            </CardTitle>
            <CardDescription>Please try again. If the issue continues, refresh the page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => reset()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </>
  );
}
