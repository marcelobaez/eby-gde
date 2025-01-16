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
  TableProps,
  GetProp,
  Flex,
} from "antd";
import { SearchExpForm } from "./SearchExpForm";
import { TableResults } from "./TableResults";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { ExtendedExp, useListInfoByID } from "../lib/fetchers";
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
import { PresetStatusColorType } from "antd/es/_util/colors";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const { Text, Title } = Typography;

export type ColumnsType<T> = TableProps<T>["columns"];
type TablePaginationConfig = Exclude<
  GetProp<TableProps, "pagination">,
  boolean
>;

interface TableParams {
  pagination?: TablePaginationConfig;
  sortField?: string[];
  sortOrder?: string;
  filters?: Parameters<GetProp<TableProps, "onChange">>[1];
}

export function ListsContainer() {
  const router = useRouter();

  const listId = (router.query.id as string) || "";

  const { data, status } = useListInfoByID(listId);

  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 100,
      showSizeChanger: true,
      pageSizeOptions: ["5", "10", "20", "50", "100", "200"],
      showTotal: (total: number, range: number[]) =>
        `${range[0]}-${range[1]} de ${total} items`,
    },
    sortOrder: "ascend",
    sortField: ["attributes", "nombre"],
  });

  useEffect(() => {
    if (data) {
      setTableParams((prev) => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: data.expedientes.length,
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
  const [selectedID, setSelectedID] = useState<number>();
  const [value, setValue] = useState<number | null>(0);

  const movsData = data?.expedientes ?? [];

  const handleSubmit = async (values: { year: number; number: number }) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    setIsSearching(false);

    const hasResults = expedientes.length;

    setSearchData(expedientes);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
  };

  const handleTableChange: TableProps<ExtendedExp>["onChange"] = (
    pagination,
    _,
    sorter
  ) => {
    setTableParams({
      pagination,
      ...sorter,
    });
  };

  const onCreate = (values: { days: number }) => {
    updateExpMutation.mutate({
      id: selectedID!,
      duracion_esperada: values.days,
    });
    setVisible(false);
  };

  const onCancel = () => {
    setVisible(false);
  };

  const columns: ColumnsType<ExtendedExp> = [
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
        <Badge
          status={record.stateColor as PresetStatusColorType}
          text={text}
        />
      ),
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
      sorter: (a, b) =>
        new Date(a.FECHA_CREACION).valueOf() -
        new Date(b.FECHA_CREACION).valueOf(),
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
        new Date(a.FECHA_OPERACION).valueOf() -
        new Date(b.FECHA_OPERACION).valueOf(),
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
          record.DESCRIPCION_REPARTICION_DESTIN
            ? ` (${record.DESCRIPCION_REPARTICION_DESTIN})`
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
            onConfirm={() => removeExpMutation.mutateAsync(record.id_exp_list)}
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
      filename={`Expedientes Lista ${data ? data.listName : ""}`}
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
          value={(col: ExtendedExp) =>
            format(parseISO(col.FECHA_CREACION), "P", {
              locale: esLocale,
            })
          }
        />
        <ExcelColumn
          label="Ultimo pase"
          value={(col: ExtendedExp) =>
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
        <Flex justify="space-between">
          <Space direction="vertical">
            <Title level={4} style={{ marginBottom: 0 }}>
              {`Detalles: ${data ? data.listName : ""}`}
            </Title>
            <Typography.Text type="secondary">
              Aqui vera los expedientes asociados a su lista. Puede agregar
              nuevos expedientes utilizando el formulario al pie
            </Typography.Text>
          </Space>
          <ExpsExport />
        </Flex>
      </Col>
      <Col span={24}>
        <Card bordered={false}>
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
                  loading={status === "pending"}
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
              handleAdd={(id: number) =>
                addExpMutation.mutateAsync({ expId: id, listId })
              }
              isAdding={addExpMutation.isPending}
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
