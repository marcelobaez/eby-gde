import Link from "next/link";
import {
  Avatar,
  Dropdown,
  Flex,
  Layout,
  Menu,
  Space,
  theme,
  Typography,
} from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  ApartmentOutlined,
  SettingFilled,
  PartitionOutlined,
  FileOutlined,
  FolderOpenOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Image } from "antd";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useBoundStore } from "@/stores/useBoundStore";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { api } from "@/lib/axios";
import { User } from "@/types/user";

const { Text } = Typography;

const { Header, Content, Footer, Sider } = Layout;

export function MainLayout({
  children,
  title = "This is the default title",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const {
    token: { colorBgContainer, colorPrimary },
  } = theme.useToken();
  const router = useRouter();
  const { data: session } = useSession();
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: async () =>
      await api.get<User>("/users/me?populate=role").then((res) => res.data),
    staleTime: Infinity,
  });

  const setUser = useBoundStore((state) => state.setUser);

  const user = useBoundStore((state) => state.user);
  const hasDocPermissions = user && user.hasDocsPermissions;
  const hasRelsPermissions = user && user.hasRelsPermissions;
  const hasAllPermissions = user && user.hasAllPermissions;
  const [collapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelected] = useState(["home"]);

  // Setear permisos en user store
  React.useEffect(() => {
    if (data) {
      setUser({
        email: data.email,
        hasAllPermissions: data.role.name.toLowerCase() === "administrator",
        hasDocsPermissions: data.role.name.toLowerCase() !== "authenticated",
        hasRelsPermissions:
          data.role.name.toLowerCase() === "administrator" ||
          data.role.name.toLowerCase() === "expobras",
      });
    }
  }, [data]);

  const handleCollapse = (collapsed: boolean) => {
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
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colorPrimary,
          padding: "0 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "start",
            alignItems: "center",
          }}
        >
          <Image
            src="/logo-new.png"
            alt="logo"
            width="266"
            height="268"
            style={{ maxWidth: "50px", height: "auto" }}
            preview={false}
          />
          <h1
            style={{
              marginBlock: 0,
              marginInline: 0,
              marginInlineStart: "8px",
              fontWeight: 600,
              color: "#fff",
              fontSize: "20px",
              lineHeight: "32px",
            }}
          >
            GDE Seguimiento
          </h1>
        </div>
        <Dropdown
          menu={{
            items: [
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
          }}
        >
          <div>
            <Space>
              <Avatar icon={<UserOutlined />} />
              <Text style={{ color: "#fff" }}>{session?.user?.name}</Text>
            </Space>
          </div>
        </Dropdown>
      </Header>
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={handleCollapse}
          theme="light"
        >
          <Flex
            gap="middle"
            vertical
            justify="space-between"
            style={{ height: "100%" }}
          >
            <Menu
              mode="inline"
              selectedKeys={selectedItem}
              items={[
                {
                  key: "seguimiento",
                  icon: <FolderOpenOutlined />,
                  label: <Link href="/seguimiento">Seguimiento</Link>,
                },
                hasAllPermissions
                  ? {
                      key: "search",
                      icon: <SearchOutlined />,
                      label: <Link href="/busqueda">Busqueda</Link>,
                    }
                  : null,
                hasDocPermissions
                  ? {
                      key: "documentos",
                      icon: <FileOutlined />,
                      label: <Link href="/documentos">Docs historicos</Link>,
                    }
                  : null,
                hasRelsPermissions
                  ? {
                      key: "asociaciones",
                      label: <Link href="/asociaciones">Jerarquias</Link>,
                      icon: <ApartmentOutlined />,
                    }
                  : null,
              ]}
            />
            {hasRelsPermissions && (
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={selectedItem}
                items={[
                  {
                    key: "admin",
                    label: "Administracion",
                    icon: <SettingFilled />,
                    children: [
                      {
                        key: "categorias",
                        label: <Link href="/categorias">Categorias</Link>,
                        icon: <PartitionOutlined />,
                      },
                    ],
                  },
                ]}
              />
            )}
          </Flex>
        </Sider>
        <Layout className="site-layout">
          <Content style={{ padding: 16 }}>{children}</Content>
          <Footer
            style={{ textAlign: "center", padding: 8 }}
          >{`EBY GDE © ${new Date().getFullYear()}`}</Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}
