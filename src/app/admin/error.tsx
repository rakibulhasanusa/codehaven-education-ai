"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ reset }: ErrorProps) {
  return (
    <Card>
      <CardHeader>
        <p className="premium-kicker">Admin Error</p>
        <CardTitle className="premium-title text-3xl font-bold tracking-tight">Dashboard failed to load</CardTitle>
        <CardDescription>
          The admin data could not be loaded. Retry the request or refresh the page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={() => reset()}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

