import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";
import { ConfigProvider } from "antd";
import esES from "antd/lib/locale/es_ES";
import { SessionProvider } from "next-auth/react";
import "antd/dist/reset.css";

export default function MyApp({ Component, pageProps }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <ConfigProvider locale={esES}>
          <SessionProvider session={pageProps.session} refetchInterval={1 * 60}>
            <Component {...pageProps} />
          </SessionProvider>
        </ConfigProvider>
      </Hydrate>
    </QueryClientProvider>
  );
}
