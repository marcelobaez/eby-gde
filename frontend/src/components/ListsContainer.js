import {
  Row,
  Col,
  Empty,
  Card,
  Typography,
  Table,
  ConfigProvider,
  Space,
  Badge,
  Tag,
  Tooltip,
  Button,
  Popconfirm,
} from "antd";
import { PageHeader } from "@ant-design/pro-layout";
import { SearchExpForm } from "./SearchExpForm";
import { TableResults } from "./TableResults";
import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "react-query";
import axios from "axios";
import { useRouter } from "next/router";
import { getListInfoByID } from "../lib/fetchers";
import { ListStatistics } from "./ListStatistics";
import {
  useAddExpMutation,
  useRemoveExpMutation,
  useUpdateExpMutation,
} from "../hooks/useList";
import { ModalSetDate } from "./ModalSetDate";
import {
  CalendarOutlined,
  DeleteOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import esLocale from "date-fns/locale/es";
import ReactExport from "react-data-export";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const { Text } = Typography;

const queryKey = "expedientes";

export function ListsContainer() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [tableParams, setTableParams] = useState({
    pagination: {
      current: 1,
      pageSize: 100,
      showSizeChanger: true,
      pageSizeOptions: ["5", "10", "20", "50", "100", "200"],
      showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} items`,
    },
    order: "ascend",
    field: ["attributes", "nombre"],
  });

  const { data, isLoading } = useQuery(
    [queryKey, router.query.id],
    () => getListInfoByID(router.query.id),
    {
      enabled: !!router.query.id,
    }
  );

  useEffect(() => {
    if (data) {
      setTableParams((prev) => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: data.attributes.expedientes.data.length,
        },
      }));
    }
  }, [data]);

  const addExpMutation = useAddExpMutation();
  const removeExpMutation = useRemoveExpMutation();
  const updateExpMutation = useUpdateExpMutation();

  const [searchData, setSearchData] = useState([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [visible, setVisible] = useState(false);
  const [selectedID, setSelectedID] = useState(null);
  const [value, setValue] = useState(0);

  const movsData = data ? data.attributes.expedientes.data : [];

  const handleSubmit = async (values) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    queryClient.invalidateQueries(queryKey);

    setIsSearching(false);

    const hasResults = expedientes.length;

    setSearchData(expedientes);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setTableParams({
      pagination,
      ...sorter,
    });
  };

  const onCreate = (values) => {
    updateExpMutation.mutate({
      id: selectedID,
      duracion_esperada: values.days,
    });
    setVisible(false);
  };

  const onCancel = () => {
    setVisible(false);
  };

  const columns = [
    {
      title: "Expediente",
      dataIndex: "EXPEDIENTE",
      key: "EXPEDIENTE",
      width: 220,
      defaultSortOrder: "descend",
      sorter: (a, b) => a.EXPEDIENTE.localeCompare(b.EXPEDIENTE),
      sortDirections: ["descend", "ascend"],
      render: (text, record) => (
        <Link href={`/movimientos/${record.ID}`}>{text}</Link>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "DESCRIPCION",
      key: "DESCRIPCION",
      width: 320,
      ellipsis: true,
      // defaultSortOrder: "descend",
      sorter: (a, b) => a.DESCRIPCION.localeCompare(b.DESCRIPCION),
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "Tiempo de vida",
      dataIndex: "FECHA_CREACION",
      key: "Lifetime",
      width: 160,
      render: (text, record) => {
        return record.lifetimeColor === "red" ? (
          <Badge count={record.daysOverdue} size="small">
            <Tag color={record.lifetimeColor} className="lifetime">
              {record.lifetime}
            </Tag>
          </Badge>
        ) : (
          <Tag color={record.lifetimeColor} className="lifetime">
            {record.lifetime}
          </Tag>
        );
      },
      // defaultSortOrder: "descend",
      sorter: (a, b) => a.lifetimeDays - b.lifetimeDays,
    },
    {
      title: "Estado",
      key: "ESTADO",
      dataIndex: "ESTADO",
      width: 150,
      render: (text, record) => (
        <span>
          <Badge status={record.stateColor} />
          {text}
        </span>
      ),
      // defaultSortOrder: "descend",
      sorter: (a, b) => a.ESTADO.localeCompare(b.ESTADO),
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "Creado",
      dataIndex: "FECHA_CREACION",
      key: "FECHA_CREACION",
      width: 100,
      render: (text) => (
        <Text>
          {format(parseISO(text), "P", {
            locale: esLocale,
          })}
        </Text>
      ),
      sorter: (a, b) => new Date(a.FECHA_CREACION) - new Date(b.FECHA_CREACION),
      sortDirections: ["descend", "ascend"],
      // defaultSortOrder: "descend",
    },
    {
      title: "Ultimo pase",
      dataIndex: "FECHA_OPERACION",
      key: "FECHA_OPERACION",
      width: 100,
      render: (text) => (
        <Text>
          {format(parseISO(text), "P", {
            locale: esLocale,
          })}
        </Text>
      ),
      sorter: (a, b) =>
        new Date(a.FECHA_OPERACION) - new Date(b.FECHA_OPERACION),
      sortDirections: ["descend", "ascend"],
      // defaultSortOrder: "descend",
    },
    {
      title: "En poder",
      dataIndex: "DESTINATARIO",
      key: "DESTINATARIO",
      width: 300,
      render: (text, record) => (
        <Text>{`${text}${
          record.descripcion_reparticion_destin
            ? ` (${record.descripcion_reparticion_destin})}`
            : ""
        }`}</Text>
      ),
      // defaultSortOrder: "descend",
      sorter: (a, b) => a.DESTINATARIO.localeCompare(b.DESTINATARIO),
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "Acciones",
      key: "action",
      fixed: "right",
      width: 80,
      render: (text, record) => (
        <Space>
          <Tooltip title="Establecer tiempo de trámite">
            <Button
              size="small"
              icon={
                <CalendarOutlined
                  onClick={() => {
                    setSelectedID(record.id_exp_list);
                    setValue(record.duracion_esperada);
                    setVisible(true);
                  }}
                />
              }
            ></Button>
          </Tooltip>
          <Popconfirm
            title="Desea quitar el elemento?"
            onConfirm={() => removeExpMutation.mutate(record.id_exp_list)}
            okText="Quitar"
            okType="danger"
          >
            <Button
              ghost
              danger
              size="small"
              icon={<DeleteOutlined />}
            ></Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const ExpsExport = () => (
    <ExcelFile
      filename={`Expedientes Lista ${data ? data.attributes.titulo : ""}`}
      element={
        <Button disabled={!data} icon={<FileExcelOutlined />}>
          Exportar
        </Button>
      }
    >
      <ExcelSheet data={movsData} name="Expedientes">
        <ExcelColumn label="Expediente" value="EXPEDIENTE" />
        <ExcelColumn label="Descripcion" value="DESCRIPCION" />
        <ExcelColumn label="Tiempo de vida" value="lifetime" />
        <ExcelColumn label="Estado" value="ESTADO" />
        <ExcelColumn
          label="Creado"
          value={(col) =>
            format(parseISO(col.FECHA_CREACION), "P", {
              locale: esLocale,
            })
          }
        />
        <ExcelColumn
          label="Ultimo pase"
          value={(col) =>
            format(parseISO(col.FECHA_OPERACION), "P", {
              locale: esLocale,
            })
          }
        />
        <ExcelColumn label="En poder" value="DESTINATARIO" />
      </ExcelSheet>
    </ExcelFile>
  );

  return (
    <Row gutter={[16, 16]} justify="center">
      <Col key="list-header" span={24}>
        <PageHeader
          onBack={() => window.history.back()}
          title="Listas de seguimiento"
          subTitle={data ? data.attributes.titulo : ""}
        />
      </Col>
      <Col span={24}>
        <Card bordered={false} extra={<ExpsExport />}>
          <Row gutter={[16, 16]}>
            {movsData.length > 0 && <ListStatistics movs={movsData} />}
            <Col span={24}>
              <ConfigProvider
                renderEmpty={() => (
                  <Empty
                    description={<span>No hay expedientes en su lista</span>}
                  />
                )}
              >
                <Table
                  columns={columns}
                  rowKey="ID"
                  loading={isLoading}
                  dataSource={movsData}
                  size="small"
                  scroll={{ x: 1300 }}
                  pagination={tableParams.pagination}
                  onChange={handleTableChange}
                />
              </ConfigProvider>
            </Col>
          </Row>
        </Card>
      </Col>
      <Col span={24}>
        <Card bordered={false} style={{ width: "100%" }}>
          <SearchExpForm
            handleSubmit={handleSubmit}
            handleReset={handleReset}
            isSearching={isSearching}
          />
        </Card>
      </Col>
      {searchData.length > 0 && (
        <Col span={24}>
          <Card bordered={false} style={{ width: "100%" }}>
            <TableResults
              data={searchData}
              handleAdd={(id) =>
                addExpMutation.mutate({ expId: id, listId: data.id })
              }
              isAdding={addExpMutation.isLoading}
            />
          </Card>
        </Col>
      )}
      {showEmpty && (
        <Col span={24}>
          <Card bordered={false} style={{ width: "100%" }}>
            <Empty description="No se encontraron resultados. Verifique los valores ingresados" />
          </Card>
        </Col>
      )}
      <ModalSetDate
        visible={visible}
        onCancel={onCancel}
        onCreate={onCreate}
        value={value}
      />
    </Row>
  );
}
