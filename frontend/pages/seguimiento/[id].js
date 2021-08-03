import { useState, useEffect } from "react";
import { MainLayout } from "../../components/MainLayout";
import { SearchExpContainer } from "../../components/SearchExpContainer";
import { Alert, Skeleton } from "antd";
import { QueryClient, useQuery } from "react-query";
import { dehydrate } from "react-query/hydration";
import { getListInfoByID } from "../../lib/fetchers";
import { getSession } from "next-auth/client";
import { useRouter } from "next/router";

export default function SegByID() {
  const router = useRouter();
  const [listId, setListId] = useState(router.query.id);
  const { data, status } = useQuery(["expedientes", listId], () => getListInfoByID(listId));

  useEffect(() => {
    setListId(router.query.id)
  }, [router.query.id])

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
  const { id } = context.query

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery(["expedientes", id], () => getListInfoByID(id));

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}
