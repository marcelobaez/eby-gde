import React from "react";
import { MainLayout } from "../components/MainLayout";
import { Card, Col, Row, Typography, Space, Tabs } from "antd";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { AssociateByGDE } from "@/components/AssociateByGDE";
import { AssociateByDoc } from "@/components/AssociateByDoc";
import { canViewAsociaciones } from "@/utils/featureGuards";

export default function Documents() {
  const tabs = [
    {
      key: "gde",
      label: "Buscar por Expediente GDE",
      children: <AssociateByGDE />,
    },
    {
      key: "fisico",
      label: "Buscar por Expediente Fisico",
      children: <AssociateByDoc mode="associate" />,
    },
  ];

  return (
    <MainLayout>
      <Row gutter={16} justify="center" style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space direction="vertical">
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              Jerarquia de expedientes
            </Typography.Title>
            <Typography.Text type="secondary">
              Consulte las asociaciones de un expediente en el sistema GDE o a
              traves de expedientes fisicos
            </Typography.Text>
          </Space>
        </Col>
      </Row>
      <Row gutter={[16, 16]} justify="center">
        <Card style={{ minHeight: "calc(100dvh - 210px)", width: "100%" }}>
          <Tabs defaultActiveKey="gde" items={tabs} />
        </Card>
      </Row>
    </MainLayout>
  );
}

export async function getServerSideProps(
  context: GetServerSidePropsContext
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

  const canAccess = canViewAsociaciones(session.role);

  if (!canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
