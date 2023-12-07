import Link from "next/link";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  EyeOutlined,
  SearchOutlined,
  ApartmentOutlined,
  SettingFilled,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useHasDocsPermissions } from "../hooks/useDocPermission";
import { useHasRelPermission } from "../hooks/useHasRelPermission";

const { Header, Content, Footer, Sider } = Layout;

export function MainLayout({ children, title = "This is the default title" }) {
  const router = useRouter();
  const { data: session } = useSession();
  // console.log(userData);
  const hasDocPermissions = useHasDocsPermissions();
  const hasRelsPermissions = useHasRelPermission();
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
        <div
          className="logo"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <Link href="/">
            <Image
              src="/logo.png"
              alt="logo"
              width="100"
              height="50"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </Link>
        </div>
        <Menu
          theme="dark"
          defaultOpenKeys={["sub1", "asociaciones"]}
          mode="inline"
          selectedKeys={selectedItem}
          items={[
            {
              key: "sub1",
              label: "Expedientes",
              icon: <FolderOpenOutlined />,
              children: [
                {
                  key: "seguimiento",
                  icon: <EyeOutlined />,
                  label: <Link href="/seguimiento">Seguimiento</Link>,
                },
                hasDocPermissions
                  ? {
                      key: "documentos",
                      icon: <SearchOutlined />,
                      label: <Link href="/documentos">Docs historicos</Link>,
                    }
                  : null,
                hasRelsPermissions
                  ? {
                      key: "asociaciones",
                      label: <Link href="/asociaciones">Jerarquias</Link>,
                      icon: <ApartmentOutlined />,
                      children: [
                        {
                          key: "categorias",
                          label: <Link href="/categorias">Categorias</Link>,
                          icon: <SettingFilled />,
                        },
                      ],
                    }
                  : null,
              ],
            },
          ]}
        />
      </Sider>
      <Layout className="site-layout">
        <Header style={{ padding: 0, background: "#fff" }}>
          <Menu
            mode="horizontal"
            items={[
              {
                key: "profile",
                label: session?.user?.name,
                icon: <UserOutlined />,
                children: [
                  {
                    key: "signout",
                    label: (
                      <a
                        href="#"
                        onClick={() => {
                          signOut();
                        }}
                      >
                        Salir
                      </a>
                    ),
                    icon: <LogoutOutlined />,
                  },
                ],
              },
            ]}
            style={{ float: "right" }}
          />
        </Header>
        <Content style={{ margin: "0 16px" }}>
          <div style={{ padding: 24, height: "auto" }}>{children}</div>
        </Content>
        <Footer
          style={{ textAlign: "center" }}
        >{`Eby GDE © ${new Date().getFullYear()}`}</Footer>
      </Layout>
    </Layout>
  );
}
