import { useState, useEffect } from "react";
import { MainLayout } from "../../components/MainLayout";
import { SearchExpContainer } from "../../components/SearchExpContainer";
import { Alert, Skeleton } from "antd";
import { useQuery } from "react-query";
import { getListInfoByID } from "../../lib/fetchers";
import { authOptions } from "../api/auth/[...nextauth]";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";

export default function SegByID() {
  const router = useRouter();
  const [listId, setListId] = useState(router.query.id);
  const { data, status } = useQuery(["expedientes", listId], () =>
    getListInfoByID(listId)
  );

  useEffect(() => {
    setListId(router.query.id);
  }, [router.query.id]);

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
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
