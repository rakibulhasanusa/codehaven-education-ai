import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminNotFound() {
  return (
    <Card>
      <CardHeader>
        <p className="premium-kicker">404</p>
        <CardTitle className="premium-title text-3xl font-bold tracking-tight">Admin page not found</CardTitle>
        <CardDescription>
          This admin route does not exist or the resource has been moved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

