import "antd/dist/antd.css";
import "../styles/vars.css";
import "../styles/global.css";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";
import { ConfigProvider } from "antd";
import esES from "antd/lib/locale/es_ES";
import { Provider } from "next-auth/client";

export default function MyApp({ Component, pageProps }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <ConfigProvider locale={esES}>
          <Provider session={pageProps.session}>
            <Component {...pageProps} />
          </Provider>
        </ConfigProvider>
      </Hydrate>
    </QueryClientProvider>
  );
}
