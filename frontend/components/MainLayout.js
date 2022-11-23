import Link from "next/link";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  FolderOpenOutlined,
  NotificationOutlined,
  LogoutOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/client";
import { useRouter } from "next/router";
import { useHasDocsPermissions } from "../hooks/useDocPermission";

const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

export function MainLayout({ children, title = "This is the default title" }) {
  const router = useRouter();
  const [session, loading] = useSession();
  const hasDocPermissions = useHasDocsPermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelected] = useState(["home"]);

  const handleCollapse = (collapsed) => {
    setCollapsed(collapsed);
  };

  useEffect(() => {
    const path = router.pathname.split("/");
    if (path[1].length > 0) {
      setSelected([path[1]]);
    } else {
      setSelected(["home"]);
    }
  }, [router.pathname]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={handleCollapse}>
        <div className="logo">
          <Link href="/">
            <a>
              <Image src="/logo.png" alt="logo" width="100" height="50" />
            </a>
          </Link>
        </div>
        <Menu
          theme="dark"
          defaultOpenKeys={["sub1", "home"]}
          mode="inline"
          selectedKeys={selectedItem}
        >
          <SubMenu key="sub1" icon={<FolderOpenOutlined />} title="Expedientes">
            <Menu.Item key="seguimiento" icon={<EyeOutlined />}>
              <Link href="/seguimiento">
                <a>Seguimiento</a>
              </Link>
            </Menu.Item>
            {hasDocPermissions && (
              <Menu.Item key="documentos" icon={<SearchOutlined />}>
                <Link href="/documentos">
                  <a>Docs historicos</a>
                </Link>
              </Menu.Item>
            )}
          </SubMenu>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header style={{ padding: 0, background: "#fff" }}>
          <Menu mode="horizontal" style={{ float: "right" }}>
            <SubMenu
              key="SubMenu"
              icon={<UserOutlined />}
              title={session?.user?.name}
            >
              <Menu.Item key="3" icon={<NotificationOutlined />} disabled>
                Mis alertas (Proximamente)
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item key="4" icon={<LogoutOutlined />}>
                <a
                  href="#"
                  onClick={() => {
                    signOut();
                  }}
                >
                  Salir
                </a>
              </Menu.Item>
            </SubMenu>
          </Menu>
        </Header>
        <Content style={{ margin: "0 16px" }}>
          <div style={{ padding: 24, height: "auto" }}>{children}</div>
        </Content>
        <Footer style={{ textAlign: "center" }}>Eby GDE © 2021</Footer>
      </Layout>
      <style jsx>
        {`
          .logo {
            height: auto;
            background: rgb(45 46 53);
            width: 100%;
          }

          .site-layout-background {
            // background: #fff;
          }

          [data-theme="dark"] .site-layout .site-layout-background {
            background: #ececec;
          }
        `}
      </style>
    </Layout>
  );
}
