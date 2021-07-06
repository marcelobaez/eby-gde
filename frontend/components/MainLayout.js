import Link from "next/link";
import { Layout, Menu, Badge } from "antd";
import {
  UserOutlined,
  FolderOpenOutlined,
  BellOutlined,
  NotificationOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/client";
import { useRouter } from "next/router";
import { menuItems } from "../lib/navigation";

const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;
export function MainLayout({ children, title = "This is the default title" }) {
  const [session] = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelected] = useState(["0"]);

  const handleCollapse = (collapsed) => {
    setCollapsed(collapsed);
  };

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
          defaultOpenKeys={["sub1"]}
          mode="inline"
          onClick={({ key }) => {
            console.log(key);
            setSelected([key]);
          }}
          selectedKeys={selectedItem}
        >
          <SubMenu key="sub1" icon={<FolderOpenOutlined />} title="Expedientes">
            {menuItems.map((item) => (
              <Menu.Item icon={item.icon} key={item.key}>
                <Link href={item.href}>
                  <a>{item.title}</a>
                </Link>
              </Menu.Item>
            ))}
          </SubMenu>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header style={{ padding: 0, background: "#fff" }}>
          <Menu mode="horizontal" style={{ float: "right" }}>
            <Menu.Item disabled key="1">
              <Badge size="small" count={5}>
                <BellOutlined />
              </Badge>
            </Menu.Item>
            <SubMenu
              key="SubMenu"
              icon={<UserOutlined />}
              title={session?.user?.name}
            >
              <Menu.Item key="0" icon={<NotificationOutlined />} disabled>
                Mis alertas (Proximamente)
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item key="1" icon={<LogoutOutlined />}>
                <a href="#" onClick={() => signOut()}>
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
