import { MainLayout } from "../components/MainLayout";
import { Col, Row, Typography, Card, Space, Tabs } from "antd";
import axios from "axios";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { User } from "@/types/user";
import { AssociateByDoc } from "@/components/AssociateByDoc";
import SearchGdeDocs from "@/components/search-gde-docs";

const { Title } = Typography;

const tabs = [
  {
    key: "gde",
    label: "Buscar documentos en GDE",
    children: <SearchGdeDocs />,
  },
  {
    key: "fisico",
    label: "Buscar Expedientes Físicos",
    children: <AssociateByDoc mode="search" />,
  },
];

export default function Documents() {
  return (
    <MainLayout>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space direction="vertical">
            <Title level={4} style={{ marginBottom: 0 }}>
              Consulta de documentos en histórico
            </Title>
            <Typography.Text type="secondary">
              Aqui puede buscar documentos GDE y descargarlos
            </Typography.Text>
          </Space>
        </Col>
        <Col span={24}>
          <Card>
            <Tabs defaultActiveKey="gde" items={tabs} />
          </Card>
        </Col>
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

  if (data && data.role.name.toLowerCase() === "authenticated") {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
