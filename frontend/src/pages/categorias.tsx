import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Drawer,
  Flex,
  Row,
  Space,
  Table,
  Typography,
} from "antd";
import { MainLayout } from "../components/MainLayout";
import {
  useQuery,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/axios";
import daysjs from "dayjs";
import { EditCategoryForm } from "../components/EditCategoryForm";
import { PlusOutlined } from "@ant-design/icons";
import { AddCategoryForm } from "../components/AddCategoryForm";
import { ColumnsType } from "antd/es/table";
import { Categoria } from "@/types/categoria";
import {
  FilterValue,
  SorterResult,
  TablePaginationConfig,
} from "antd/es/table/interface";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import axios from "axios";
import { User } from "@/types/user";

interface TableParams extends SorterResult<Categoria> {
  pagination?: TablePaginationConfig;
}

export default function Categorias() {
  const queryClient = useQueryClient();
  const [editopened, setEditOpened] = useState(false);
  const [createopened, setCreateOpened] = useState(false);
  const [formData, setFormData] = useState<{
    id: number;
    data: { nombre: string };
  }>();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 10,
    },
    field: ["attributes", "nombre"],
    order: "ascend",
  });

  const { data: tagsData, isLoading } = useQuery({
    queryKey: ["tags", tableParams],

    queryFn: async () =>
      await api.get(
        `/expedientes-tipos?${
          tableParams.pagination?.current
            ? `pagination[page]=${tableParams.pagination.current}`
            : ""
        }${
          tableParams.pagination?.pageSize
            ? `&pagination[pageSize]=${tableParams.pagination.pageSize}`
            : ""
        }${
          tableParams.field
            ? `&sort=${
                Array.isArray(tableParams.field)
                  ? tableParams.field[1]
                  : tableParams.field
              }:${tableParams.order === "ascend" ? "asc" : "desc"}`
            : ""
        }`
      ),
  });

  useEffect(() => {
    if (tagsData) {
      setTableParams((prev) => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: tagsData.data.meta.pagination.total,
        },
      }));
    }
  }, [tagsData]);

  const columns: ColumnsType<Categoria> = [
    {
      title: "Nombre",
      dataIndex: ["attributes", "nombre"],
      sorter: true,
      defaultSortOrder: "ascend",
    },
    {
      title: "Creado",
      dataIndex: ["attributes", "createdAt"],
      render: (record) => daysjs(record).format("DD/MM/YYYY hh:mm"),
    },
    {
      title: "Modificado",
      dataIndex: ["attributes", "updatedAt"],
      render: (record) => daysjs(record).format("DD/MM/YYYY hh:mm"),
    },
    {
      title: "Acciones",
      key: "action",
      render: (text, record, index) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={() => {
              setFormData({
                id: record.id,
                data: {
                  nombre: record.attributes.nombre,
                },
              });
              setEditOpened(true);
            }}
          >
            Editar
          </Button>
        </Space>
      ),
    },
  ];

  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<Categoria> | SorterResult<Categoria>[]
  ) => {
    setTableParams({
      pagination,
      ...sorter,
    });
  };

  const tableData = tagsData ? tagsData.data.data : [];

  return (
    <MainLayout>
      <Row gutter={[16, 16]} justify="center">
        <Col span={24}>
          <Flex justify="space-between">
            <Space direction="vertical">
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                Categorias de expedientes
              </Typography.Title>
              <Typography.Text type="secondary">
                Administre y cree las categorias o etiquetas para jerarquias de
                expedientes
              </Typography.Text>
            </Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setCreateOpened(true)}
              type="primary"
            >
              Agregar
            </Button>
          </Flex>
        </Col>
        <Col span={24}>
          <Card
            bordered={false}
            style={{ width: "100%", minHeight: "calc(100vh - 250px)" }}
          >
            <Space size="middle" direction="vertical" style={{ width: "100%" }}>
              <Table
                size="small"
                columns={columns}
                rowClassName={() => "editable-row"}
                rowKey={(record) => record.id}
                dataSource={tableData}
                pagination={tableParams.pagination}
                loading={isLoading}
                onChange={handleTableChange}
              />
            </Space>
          </Card>
        </Col>
      </Row>
      {/* Edit form */}
      <QueryClientProvider client={queryClient}>
        <Drawer
          open={editopened}
          title="Editar categoria"
          onClose={() => setEditOpened(false)}
        >
          {formData && (
            <EditCategoryForm
              onCancel={() => setEditOpened(false)}
              formData={formData.data}
              id={formData.id}
              onSubmitSuccess={() => setEditOpened(false)}
            />
          )}
        </Drawer>
      </QueryClientProvider>
      {/* Create form */}
      <QueryClientProvider client={queryClient}>
        <Drawer
          open={createopened}
          title="Crear categoria"
          onClose={() => setCreateOpened(false)}
        >
          <AddCategoryForm onSubmitSuccess={() => setCreateOpened(false)} />
        </Drawer>
      </QueryClientProvider>
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

  const canAccess =
    data.role.name.toLowerCase() === "administrator" ||
    data.role.name.toLowerCase() === "expobras";

  if (data && !canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
