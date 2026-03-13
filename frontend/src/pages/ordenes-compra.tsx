import { canAccessOrdenesCompra } from "@/utils/featureGuards";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, Space, Typography, Button } from "antd";
import { LeftOutlined } from "@ant-design/icons";
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
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      const referrer = document.referrer;
      const currentOrigin = window.location.origin;
      const cameFromApp = referrer && referrer.startsWith(currentOrigin);
      const hasHistory = window.history.length > 1;
      setCanGoBack(!!cameFromApp || hasHistory);
    }
  }, [router.isReady]);

  useEffect(() => {
    if (router.isReady) {
      const tab = router.query.tab as string;
      if (tab === "gde" || tab === "maximo") {
        setActiveTabKey(tab);
      } else {
        setActiveTabKey("gde");
      }
    }
  }, [router.isReady, router.query.tab]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
    router.push({ query: { ...router.query, tab: key } }, undefined, {
      shallow: true,
    });
  };

  return (
    <MainLayout>
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <Space align="center">
          {canGoBack && (
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => router.back()}
            >
              Volver atrás
            </Button>
          )}
          <Typography.Title level={4} style={{ marginBottom: 0 }}>
            Búsqueda de Órdenes de Compra
          </Typography.Title>
        </Space>
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
