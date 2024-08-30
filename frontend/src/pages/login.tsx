import { Layout, Button, Row, Col, Typography, Space, Card, Image } from "antd";
import { WindowsOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import { GetServerSideProps } from "next";

const { Footer, Content } = Layout;
const { Text } = Typography;

export default function Login() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Content
        style={{
          padding: 24,
        }}
      >
        <Row gutter={16} justify="center" style={{ height: "100%" }}>
          <Col span={8} style={{ textAlign: "center" }}>
            <Card bordered={false}>
              <Space direction="vertical" size="large">
                <Image src="/logo-big.png" alt="logo" width="250" height="50" />
                <Text>Herramienta de seguimiento de expedientes</Text>
                <Button
                  onClick={() => signIn("azure-ad")}
                  type="primary"
                  icon={<WindowsOutlined />}
                >
                  Iniciar sesión con su cuenta eby
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Content>
      <Footer
        style={{ textAlign: "center" }}
      >{`Eby GDE © ${new Date().getFullYear()}`}</Footer>
    </Layout>
  );
}

export const getServerSideProps = (async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions);

  if (session && session.jwt) {
    return {
      redirect: {
        destination: "/seguimiento",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session: null,
    },
  };
}) satisfies GetServerSideProps;
