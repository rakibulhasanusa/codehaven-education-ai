import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-10 md:px-8">
      <Card className="w-full text-center">
        <CardHeader>
          <p className="premium-kicker">404</p>
          <CardTitle className="premium-title text-3xl font-bold tracking-tight md:text-4xl">
            Page Not Found
          </CardTitle>
          <CardDescription>The page you are looking for does not exist or has been moved.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Go Back Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
