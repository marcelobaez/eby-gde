import { Table, Button, Badge, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { setStatus } from "../utils/index";

const { Title } = Typography;

export function TableResults({ data, handleAdd, isAdding }) {
  const columns = [
    {
      title: "Codigo",
      dataIndex: "CODIGO",
      key: "code",
      render: (text) => <a>{text}</a>,
    },
    {
      title: "Descripción",
      dataIndex: "DESCRIPCION",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Estado",
      dataIndex: "ESTADO",
      key: "state",
      render: (text) => (
        <span>
          <Badge status={setStatus(text)} />
          {text}
        </span>
      ),
    },
    {
      title: "Acciones",
      key: "action",
      render: (text, record) => (
        <Button
          type="primary"
          loading={isAdding}
          onClick={() => handleAdd(record.ID)}
          ghost
          size="small"
          icon={<PlusOutlined />}
        >
          Agregar a la lista
        </Button>
      ),
    },
  ];

  return (
    <Table
      pagination={false}
      size="small"
      rowKey="ID"
      columns={columns}
      dataSource={data}
      title={() => <Title level={5}>Resultados</Title>}
    />
  );
}
