import {
  Card,
  Col,
  Row,
  Alert,
  Space,
  Button,
  message,
  Typography,
  Popconfirm,
  Flex,
  Empty,
} from "antd";
import { MainLayout } from "../../components/MainLayout";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getListas } from "../../lib/fetchers";
import { getServerSession } from "next-auth/next";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { authOptions } from "../api/auth/[...nextauth]";
import { api } from "../../lib/axios";
import {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  InferGetServerSidePropsType,
} from "next";
import { Session } from "next-auth";
import { ModalCreateButton } from "@/components/ModalCreateButton";
import { useRouter } from "next/router";
const { Title } = Typography;
const { Meta } = Card;

export default function Seguimiento({
  session,
}: {
  session: Session;
}): InferGetServerSidePropsType<typeof getServerSideProps> {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, status } = useQuery({
    queryKey: ["listas"],
    queryFn: getListas,
    enabled: !!session,
  });

  const updateListMutation = useMutation({
    mutationFn: async (body: { id: number; titulo: string }) => {
      const { id, titulo } = body;
      return await api.put(`/listas/${id}`, {
        data: { titulo },
      });
    },
    onError: () => {
      message.error("No fue posible actualizar la lista");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
    },
  });

  const removeListMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/listas/${id}`),
    onError: () => {
      message.error("No fue posible eliminar la lista");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
      message.success("Lista eliminada");
    },
  });

  if (status === "pending") {
    return (
      <MainLayout>
        <Flex gap="middle">
          {[0, 1, 2].map((_, idx) => (
            <Card
              style={{ width: 300 }}
              key={idx + "card-loading"}
              loading={true}
            />
          ))}
        </Flex>
      </MainLayout>
    );
  }

  if (status === "error") {
    return (
      <MainLayout>
        <Alert
          message="Error"
          description="No fue posible realizar la operacion."
          type="error"
          showIcon
        />
      </MainLayout>
    );
  }

  const handleEdit = (id: number, value: string) => {
    updateListMutation.mutate({ id, titulo: value });
  };

  const handleDelete = (id: number) => {
    removeListMutation.mutate(id);
  };

  return (
    <MainLayout>
      <Row gutter={[16, 16]}>
        <Col key="list-header" span={24}>
          <Flex justify="space-between" gap="small">
            <Space direction="vertical">
              <Title level={4} style={{ marginBottom: 0 }}>
                Listas de seguimiento
              </Title>
              <Typography.Text type="secondary">
                Cree y administre sus listas de seguimiento de expedientes
              </Typography.Text>
            </Space>
            <ModalCreateButton />
          </Flex>
        </Col>
        {data.length === 0 && (
          <Flex justify="center" style={{ width: "100%" }}>
            <Empty description="No hay listas">
              Cree una utilizando el boton <b>Crear lista</b>
            </Empty>
          </Flex>
        )}
        {data.length > 0 &&
          data.map((list) => (
            <Col key={list.id} span={8}>
              <Card
                actions={[
                  <Popconfirm
                    key="delete"
                    okType="danger"
                    onConfirm={() => handleDelete(list.id)}
                    title="Está seguro？Esta acción no es reversible"
                    okText="Eliminar"
                    cancelText="No"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                    ></Button>
                  </Popconfirm>,
                  <Button
                    key="view"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => router.push(`/seguimiento/${list.id}`)}
                  ></Button>,
                ]}
              >
                <Meta
                  title={
                    <Typography.Title
                      level={5}
                      style={{ margin: 0 }}
                      editable={{
                        onChange: (value) => handleEdit(list.id, value),
                      }}
                    >
                      {list.attributes.titulo}
                    </Typography.Title>
                  }
                  description={`${
                    list.attributes.expedientes.data.length > 0
                      ? `Siguiendo ${list.attributes.expedientes.data.length} expediente(s)`
                      : "Sin expedientes"
                  }`}
                />
              </Card>
            </Col>
          ))}
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
    props: {
      session,
    },
  };
}
