import {
  Card,
  Col,
  Row,
  Skeleton,
  Alert,
  Space,
  Button,
  message,
  Typography,
  Popconfirm,
  Tooltip,
  Flex,
} from "antd";
import { MainLayout } from "../../components/MainLayout";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getListas } from "../../lib/fetchers";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { ArrowLeftOutlined, DeleteOutlined } from "@ant-design/icons";
import { authOptions } from "../api/auth/[...nextauth]";
import { api } from "../../lib/axios";
import {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  InferGetServerSidePropsType,
} from "next";
import { Session } from "next-auth";
import { ModalCreateButton } from "@/components/ModalCreateButton";
const { Paragraph, Title, Text } = Typography;

export default function Seguimiento({
  session,
}: {
  session: Session;
}): InferGetServerSidePropsType<typeof getServerSideProps> {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["listas"],
    queryFn: getListas,
    enabled: !!session,
  });
  const queryClient = useQueryClient();

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
    onError: (err, variables, previousValue) => {
      message.error("No fue posible eliminar la lista");
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
      message.success("Lista eliminada");
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <Skeleton active />
      </MainLayout>
    );
  }

  if (isError) {
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
          <Flex
            justify="space-between"
            gap="small"
            style={{ padding: "0.5rem 0" }}
          >
            <Space align="center">
              <Button
                icon={<ArrowLeftOutlined />}
                type="text"
                onClick={() => window.history.back()}
              />
              <Title level={4} style={{ marginBottom: 0 }}>
                Listas de seguimiento
              </Title>
            </Space>
            <ModalCreateButton />
          </Flex>
        </Col>
        {data &&
          data.map((list) => (
            <Col key={list.id} span={8}>
              <Card
                title={
                  <Paragraph
                    editable={{
                      onChange: (value) => handleEdit(list.id, value),
                    }}
                  >
                    {list.attributes.titulo}
                  </Paragraph>
                }
                bordered={false}
                hoverable
                extra={
                  <Space>
                    {data.length === 1 ? (
                      <Tooltip title="No puede eliminar la unica lista">
                        <Button
                          disabled
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    ) : (
                      <Popconfirm
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
                      </Popconfirm>
                    )}
                    <Link legacyBehavior href={`/seguimiento/${list.id}`}>
                      <a>Ver</a>
                    </Link>
                  </Space>
                }
              >
                {`${
                  list.attributes.expedientes.data.length > 0
                    ? `Siguiendo ${list.attributes.expedientes.data.length} expediente(s)`
                    : "Sin expedientes"
                }`}
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
