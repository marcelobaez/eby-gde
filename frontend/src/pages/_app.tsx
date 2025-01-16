import React from "react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
} from "@tanstack/react-query";
import { App, ConfigProvider, ThemeConfig } from "antd";
import esES from "antd/lib/locale/es_ES";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import "antd/dist/reset.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/pages";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#006C42",
    // colorBgContainer: "#fff",
  },
};

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <HydrationBoundary state={pageProps.dehydratedState}>
        <ConfigProvider locale={esES} theme={theme}>
          <SessionProvider session={pageProps.session} refetchInterval={1 * 60}>
            <App>
              <NuqsAdapter>
                <Component {...pageProps} />
              </NuqsAdapter>
            </App>
          </SessionProvider>
        </ConfigProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
