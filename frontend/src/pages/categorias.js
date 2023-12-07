import React, { useEffect, useState } from "react";
import { Button, Card, Col, Drawer, Row, Space, Table } from "antd";
import { MainLayout } from "../components/MainLayout";
import { useQuery, QueryClientProvider, useQueryClient } from "react-query";
import { api } from "../lib/axios";
import daysjs from "dayjs";
import { EditCategoryForm } from "../components/EditCategoryForm";
import { PlusOutlined } from "@ant-design/icons";
import { AddCategoryForm } from "../components/AddCategoryForm";

export default function Categorias() {
  const queryClient = useQueryClient();
  const [editopened, setEditOpened] = useState(false);
  const [createopened, setCreateOpened] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
  });
  const [tableParams, setTableParams] = useState({
    pagination: {
      current: 1,
      pageSize: 10,
    },
    order: "ascend",
    field: ["attributes", "nombre"],
  });
  const { data: tagsData, isLoading } = useQuery(
    ["tags", tableParams],
    async () =>
      await api.get(
        `/expedientes-tipos?${
          tableParams.pagination.current
            ? `pagination[page]=${tableParams.pagination.current}`
            : ""
        }${
          tableParams.pagination.pageSize
            ? `&pagination[pageSize]=${tableParams.pagination.pageSize}`
            : ""
        }${
          tableParams.field
            ? `&sort=${tableParams.field[1]}:${
                tableParams.order === "ascend" ? "asc" : "desc"
              }`
            : ""
        }`
      )
  );

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

  const columns = [
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

  const handleTableChange = (pagination, filters, sorter) => {
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
          <Card
            title={`Categorias de expedientes`}
            bordered={false}
            style={{ width: "100%", minHeight: "calc(100vh - 180px)" }}
            extra={
              <Button
                icon={<PlusOutlined />}
                onClick={() => setCreateOpened(true)}
                type="primary"
              >
                Agregar
              </Button>
            }
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
          <EditCategoryForm
            onCancel={() => setEditOpened(false)}
            formData={formData.data}
            id={formData.id}
            onSubmitSuccess={() => setEditOpened(false)}
          />
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
