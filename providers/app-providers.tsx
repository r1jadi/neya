"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { PostHogAnalytics } from "@/providers/posthog-provider";
import { MyNightProvider } from "@/components/my-night/my-night-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light"]}
    >
      <PostHogAnalytics>
        <QueryClientProvider client={client}>
          <MyNightProvider>{children}</MyNightProvider>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </QueryClientProvider>
      </PostHogAnalytics>
    </ThemeProvider>
  );
}
