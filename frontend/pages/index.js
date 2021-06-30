import { MainLayout } from "../components/MainLayout";
import { SearchExpContainer } from "../components/SearchExpContainer";
import { Alert, Skeleton } from "antd";
import { QueryClient, useQuery } from "react-query";
import { dehydrate } from "react-query/hydration";
import { getListas } from "../lib/fetchers";
import { getSession } from "next-auth/client";

export default function Index() {
  const { data, status } = useQuery("listas", getListas);

  if (status === "loading") {
    return (
      <MainLayout>
        <Skeleton active />
      </MainLayout>
    );
  }

  if (status === "error") {
    return (
      <MainLayout>
        <Alert
          message="Error"
          description="No fue posible realizar la operacion."
          type="error"
          showIcon
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SearchExpContainer data={data} />
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery("listas", getListas);

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}
