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
  Checkbox,
  notification,
  Input,
  Modal,
} from "antd";
import { SearchExpForm } from "./SearchExpForm";
import { TableResults } from "./TableResults";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { ExtendedExp, useListInfoByID } from "../lib/fetchers";
import { ListStatistics } from "./ListStatistics";
import {
  useAddExpMutation,
  useRemoveExpMutation,
  useUpdateExpMutation,
  useToggleReminderMovMutation,
} from "../hooks/useList";
import { ModalSetDate } from "./ModalSetDate";
import { CalendarOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import esLocale from "date-fns/locale/es";
import { PresetStatusColorType } from "antd/es/_util/colors";
import React from "react";
import { ExportButton } from "./ExportButton";

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

const Context = React.createContext({ name: "ListsContainer" });

export function ListsContainer() {
  const router = useRouter();

  const [rows, setRows] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const [api, contextHolder] = notification.useNotification();

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
  const toggleReminderMovMutation = useToggleReminderMovMutation();

  const anyMutationPending =
    addExpMutation.isPending ||
    removeExpMutation.isPending ||
    updateExpMutation.isPending ||
    toggleReminderMovMutation.isPending;

  const [searchData, setSearchData] = useState([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [visible, setVisible] = useState(false);
  const [selectedID, setSelectedID] = useState<number>();
  const [value, setValue] = useState<number | null>(0);

  type EditField = "alt_desc" | "observaciones";
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<EditField>("alt_desc");
  const [selectedExpForEdit, setSelectedExpForEdit] = useState<{
    id: number;
    currentValue: string;
    originalDesc?: string;
  } | null>(null);
  const [editTextValue, setEditTextValue] = useState("");

  const movsData = data?.expedientes ?? [];

  const handleSubmit = async (values: { year: number; number: number }) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`,
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
    sorter,
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
    setSelectedID(undefined);
    setValue(0);
  };

  const onCancel = () => {
    setVisible(false);
  };

  const openNotificationWithIcon = () => {
    api["warning"]({
      message: "Advertencia",
      description: (
        <>
          <p>Debe establecer un tiempo de trámite.</p>
          <p>
            Utilice el icono <CalendarOutlined /> en la columna acciones
          </p>
        </>
      ),
    });
  };

  const columns: ColumnsType<ExtendedExp> = [
    {
      title: "Expediente",
      dataIndex: "EXPEDIENTE",
      key: "EXPEDIENTE",
      width: 240,
      defaultSortOrder: "descend",
      sorter: (a, b) => a.EXPEDIENTE.localeCompare(b.EXPEDIENTE),
      sortDirections: ["descend", "ascend"],
      render: (text, record) => (
        <Text copyable={{ text: record.EXPEDIENTE }}>
          <Link href={`/movimientos/${record.ID}`}>{text}</Link>
        </Text>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "DESCRIPCION",
      key: "DESCRIPCION",
      width: 320,
      // defaultSortOrder: "descend",
      sorter: (a, b) =>
        (a.alt_desc || a.DESCRIPCION).localeCompare(
          b.alt_desc || b.DESCRIPCION,
        ),
      sortDirections: ["descend", "ascend"],
      render: (text, record) => (
        <Flex>
          <Typography.Paragraph
            style={{ marginBottom: 0 }}
            ellipsis={{
              rows,
              expandable: "collapsible",
              expanded,
              onExpand: (_, info) => setExpanded(info.expanded),
              symbol: expanded ? "Ver menos" : "Ver más",
            }}
          >
            {record.alt_desc || text}
          </Typography.Paragraph>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditField("alt_desc");
              const defaultValue = record.alt_desc || text;
              setSelectedExpForEdit({
                id: record.id_exp_list,
                currentValue: defaultValue,
                originalDesc: text,
              });
              setEditTextValue(defaultValue);
              setEditModalVisible(true);
            }}
          />
        </Flex>
      ),
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
      width: 120,
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
      title: "Observaciones",
      dataIndex: "observaciones",
      key: "observaciones",
      width: 200,
      render: (text, record) => (
        <div
          onClick={() => {
            setEditField("observaciones");
            setSelectedExpForEdit({
              id: record.id_exp_list,
              currentValue: text ?? "",
            });
            setEditTextValue(text ?? "");
            setEditModalVisible(true);
          }}
          style={{ cursor: "pointer", minHeight: "24px" }}
        >
          {text || <span style={{ color: "#bfbfbf" }}>Click para agregar</span>}
        </div>
      ),
    },
    {
      title: "Aviso Venc.",
      dataIndex: "send_reminder",
      key: "send_reminder",
      fixed: "right",
      width: 100,
      align: "center",
      render: (text, record) => (
        <Checkbox
          checked={record.send_reminder ?? false}
          disabled={
            record.ESTADO === "Guarda Temporal" || updateExpMutation.isPending
          }
          onChange={(e) => {
            if (e.target.checked && record.duracion_esperada === null) {
              openNotificationWithIcon();
            } else {
              updateExpMutation.mutate({
                id: record.id_exp_list,
                send_reminder: e.target.checked,
              });
            }
          }}
        />
      ),
    },
    {
      title: "Aviso Mov.",
      dataIndex: "send_reminder_mov",
      key: "send_reminder_mov",
      fixed: "right",
      width: 100,
      align: "center",
      render: (text, record) => (
        <Checkbox
          checked={record.send_reminder_mov ?? false}
          onChange={(e) => {
            toggleReminderMovMutation.mutate({
              id: record.id_exp_list,
              id_expediente: record.ID.toString(),
              ult_mov_id: record.ult_mov_id,
              send_reminder_mov: e.target.checked,
            });
          }}
        />
      ),
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

  const exportColumns = [
    {
      key: "EXPEDIENTE",
      label: "Expediente",
    },
    {
      key: "DESCRIPCION",
      label: "Descripción",
      format: (value: string, record: ExtendedExp) =>
        (record.alt_desc || value || "").replace(/\n/g, " ").trim(),
    },
    {
      key: "lifetime",
      label: "Tiempo de vida",
      format: (value: string) => (value || "").replace(/\n/g, " ").trim(),
    },
    {
      key: "ESTADO",
      label: "Estado",
    },
    {
      key: "FECHA_CREACION",
      label: "Creado",
      format: (value: string) =>
        format(parseISO(value), "P", { locale: esLocale }),
    },
    {
      key: "FECHA_OPERACION",
      label: "Último pase",
      format: (value: string) =>
        format(parseISO(value), "P", { locale: esLocale }),
    },
    {
      key: "DESTINATARIO",
      label: "En poder",
      format: (value: string) => (value || "").replace(/\n/g, " ").trim(),
    },
    {
      key: "observaciones",
      label: "Observaciones",
      format: (value: string) => (value || "").replace(/\n/g, " ").trim(),
    },
    {
      key: "alt_desc",
      label: "Descripción Alternativa",
      format: (value: string) => (value || "").replace(/\n/g, " ").trim(),
    },
  ];

  const contextValue = useMemo(() => ({ name: "ListsContainer" }), []);

  return (
    <Context.Provider value={contextValue}>
      {contextHolder}
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
            <Space>
              <ExportButton
                data={data?.expedientes || []}
                filename={`Expedientes Lista ${data?.listName || ""}`}
                columns={exportColumns}
              />
            </Space>
          </Flex>
        </Col>
        <Col span={24}>
          <Card>
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
                    loading={status === "pending" || anyMutationPending}
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
          <Card style={{ width: "100%" }}>
            <SearchExpForm
              handleSubmit={handleSubmit}
              handleReset={handleReset}
              isSearching={isSearching}
            />
          </Card>
        </Col>
        {searchData.length > 0 && (
          <Col span={24}>
            <Card style={{ width: "100%" }}>
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
            <Card style={{ width: "100%" }}>
              <Empty description="No se encontraron resultados. Verifique los valores ingresados" />
            </Card>
          </Col>
        )}
        <ModalSetDate
          visible={visible && selectedID !== undefined}
          onCancel={onCancel}
          onCreate={onCreate}
          value={value}
        />
        <Modal
          title={
            editField === "alt_desc"
              ? "Editar Descripción Alternativa"
              : "Editar Observaciones"
          }
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            setSelectedExpForEdit(null);
          }}
          onOk={() => {
            if (selectedExpForEdit) {
              const updateData =
                editField === "alt_desc"
                  ? { alt_desc: editTextValue || null }
                  : { observaciones: editTextValue || null };
              updateExpMutation.mutate({
                id: selectedExpForEdit.id,
                ...updateData,
              });
              setEditModalVisible(false);
              setSelectedExpForEdit(null);
            }
          }}
          okText="Guardar"
          cancelText="Cancelar"
        >
          {editField === "alt_desc" && (
            <p style={{ marginBottom: 8, color: "#666" }}>
              Descripción original: <em>{selectedExpForEdit?.originalDesc}</em>
            </p>
          )}
          <Input.TextArea
            value={editTextValue}
            onChange={(e) => setEditTextValue(e.target.value)}
            rows={4}
            placeholder={
              editField === "alt_desc"
                ? "Ingrese descripción alternativa"
                : "Ingrese observaciones"
            }
          />
        </Modal>
      </Row>
    </Context.Provider>
  );
}
