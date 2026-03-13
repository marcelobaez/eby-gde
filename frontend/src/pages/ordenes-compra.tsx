import { canAccessOrdenesCompra } from "@/utils/featureGuards";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, Space, Typography } from "antd";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { GDESearch } from "@/components/ordenes-compra/gde-search";
import { MaximoSearch } from "@/components/ordenes-compra/maximo-search";

const tabList = [
  {
    key: "gde",
    tab: "GDE",
  },
  {
    key: "maximo",
    tab: "MAXIMO",
  },
];

const contentList: Record<string, React.ReactNode> = {
  gde: <GDESearch />,
  maximo: <MaximoSearch />,
};

export default function OrdenesCompra() {
  useSessionGuard();
  const router = useRouter();
  const [activeTabKey, setActiveTabKey] = useState<string>("gde");

  useEffect(() => {
    if (router.isReady) {
      const tab = router.query.tab as string;
      if (tab === "gde" || tab === "maximo") {
        setActiveTabKey(tab);
      } else {
        setActiveTabKey("gde");
      }

      // oc param only makes sense on maximo tab — strip it otherwise
      if (tab !== "maximo" && router.query.oc) {
        const { oc, tab: _tab, ...rest } = router.query;
        router.replace({ query: rest }, undefined, { shallow: true });
      }
    }
  }, [router.isReady, router.query.tab, router.query.oc]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
    if (key === "maximo") {
      const currentOc = router.query.oc;
      router.push(
        { query: currentOc ? { tab: key, oc: currentOc } : { tab: key } },
        undefined,
        { shallow: true },
      );
    } else {
      // GDE tab: strip oc and tab params, keep date/search params
      const { oc, tab, ...rest } = router.query;
      router.push({ query: rest }, undefined, { shallow: true });
    }
  };

  return (
    <MainLayout>
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <Typography.Title level={4} style={{ marginBottom: 0 }}>
          Búsqueda de Órdenes de Compra
        </Typography.Title>
        <Card
          style={{ width: "100%", maxHeight: "100%" }}
          tabList={tabList}
          activeTabKey={activeTabKey}
          onTabChange={onTabChange}
        >
          {contentList[activeTabKey]}
        </Card>
      </Space>
    </MainLayout>
  );
}

export async function getServerSideProps(
  context: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<{}>> {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const canAccess = canAccessOrdenesCompra(session.role);

  if (!canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
