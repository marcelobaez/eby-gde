import { Layout, Button, Row, Col, Typography, Space, Card } from "antd";
import { WindowsOutlined } from "@ant-design/icons";
import { providers, signIn, getSession, csrfToken } from "next-auth/client";
import Image from "next/image";

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
                  onClick={() => signIn("azure-ad-b2c")}
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
      <Footer style={{ textAlign: "center" }}>Eby GDE © 2021</Footer>
    </Layout>
  );
}

export const getServerSideProps = async (context) => {
  const session = await getSession(context);

  if (session && session.jwt) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session: null,
      providers: await providers(context),
      csrfToken: await csrfToken(context),
    },
  };
};
