import { MainLayout } from "../components/MainLayout";
import { Col, Row, Typography, Card, Space, Alert, Flex } from "antd";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import SearchGdeDocs from "@/components/search-gde-docs";

const { Title } = Typography;

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
            <Flex justify="center">
              <Alert
                message="Aviso importante"
                description="No podrá descargar documentos que fueron creados en los ultimos 30 dias. Para esos casos utilice GDE"
                type="info"
                showIcon
                style={{ maxWidth: "450px", marginBottom: 20 }}
              />
            </Flex>
            <SearchGdeDocs />
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

  return {
    props: {},
  };
}
