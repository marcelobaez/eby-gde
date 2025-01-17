import React from "react";
import { MainLayout } from "../components/MainLayout";
import { Card, Col, Row, Typography, Space, Tabs } from "antd";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import axios from "axios";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { User } from "@/types/user";
import { AssociateByGDE } from "@/components/AssociateByGDE";
import { AssociateByDoc } from "@/components/AssociateByDoc";

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
      children: <AssociateByDoc />,
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

  const { data } = await axios.get<User>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/me?populate=role`,
    {
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
    }
  );

  const canAccess =
    data.role.name.toLowerCase() === "administrator" ||
    data.role.name.toLowerCase() === "expobras" ||
    data.role.name.toLowerCase() === "expsearch";

  if (data && !canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
