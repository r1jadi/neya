"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { PostHogAnalytics } from "@/providers/posthog-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false} defaultTheme="dark">
      <PostHogAnalytics>
        <QueryClientProvider client={client}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </QueryClientProvider>
      </PostHogAnalytics>
    </ThemeProvider>
  );
}
