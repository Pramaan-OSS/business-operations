"use client";

import "@/styles/globals.css";
import { Button } from "@business-operations/ui/button";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full text-center px-4">
            <h2 className="font-medium mb-4">Something went wrong</h2>
            <p className="text-sm text-[#878787] mb-6">
              The page could not finish loading.
              <br />
              Try refreshing the page.
            </p>

            <p className="text-sm text-muted-foreground">If this continues, contact the person who runs your installation.</p>

            {error.digest && (
              <p className="text-xs text-[#4a4a4a] mt-4">
                Error ID: {error.digest}
              </p>
            )}

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-6"
            >
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
