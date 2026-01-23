import React from "react";
import { mkConfig, generateCsv, download } from "export-to-csv";
import {
  Card,
  Col,
  Row,
  Typography,
  Space,
  Flex,
  List,
  Skeleton,
  Button,
  Badge,
  Drawer,
  Descriptions,
  ConfigProvider,
  Empty,
  Tag,
  DatePicker,
  Statistic,
  Tabs,
} from "antd";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ToldoExpedienteResponse,
  ToldoExpedienteResult,
} from "../pages/api/toldo/expedientes";
import { useRouter } from "next/router";
import { FileExcelOutlined } from "@ant-design/icons";
import {
  parseAsString,
  parseAsInteger,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { message } from "antd";
import { formatDateForAPI } from "@/utils";
import { getDefaultDateRange, rangePresets } from "@/utils/date-range";
import dayjs from "dayjs";
import type { RangePickerProps } from "antd/es/date-picker";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export function ExpedientesTab() {
  const router = useRouter();

  const [openExpDrawer, setOpenExpDrawer] = React.useState(false);
  const [selectedExpediente, setSelectedExpediente] =
    React.useState<ToldoExpedienteResult | null>(null);

  // URL state for expedientes tab
  const [expPageSize, setExpPageSize] = useQueryState(
    "expPageSize",
    parseAsInteger.withDefault(10)
  );
  const [expPage, setExpPage] = useQueryState(
    "expPage",
    parseAsInteger.withDefault(1)
  );

  const defaultRange = getDefaultDateRange();
  const [{ expStartDate, expEndDate }, setExpDateRange] = useQueryStates({
    expStartDate: parseAsString.withDefault(
      formatDateForAPI(defaultRange[0].toDate())
    ),
    expEndDate: parseAsString.withDefault(
      formatDateForAPI(defaultRange[1].toDate())
    ),
  });

  // Trata type filter state (empty array means all selected)
  const [selectedTratas, setSelectedTratas] = React.useState<string[]>([]);
  const allTratasSelected = selectedTratas.length === 0;

  // Toggle a trata type filter
  const toggleTratatypeFilter = (trata: string) => {
    if (allTratasSelected && expData?.stats?.trataTypeStats) {
      // First click when all selected: deselect only this type (select all others)
      const allTratas = expData.stats.trataTypeStats.map((s) => s.trata_nombre);
      setSelectedTratas(allTratas.filter((t) => t !== trata));
    } else if (selectedTratas.includes(trata)) {
      // Deselect this type
      setSelectedTratas(selectedTratas.filter((t) => t !== trata));
    } else {
      // Add this type to selection
      setSelectedTratas([...selectedTratas, trata]);
    }
    setExpPage(1);
  };

  // Check if a trata type is selected
  const isTratatypeSelected = (trata: string) =>
    allTratasSelected || selectedTratas.includes(trata);

  // Export mutation for expedientes
  const exportExpMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "5000",
      });

      if (expStartDate) params.append("startDate", expStartDate);
      if (expEndDate) params.append("endDate", expEndDate);
      if (selectedTratas.length > 0) {
        params.append("tratas", selectedTratas.join(","));
      }

      const { data } = await axios.get<ToldoExpedienteResponse>(
        `/api/toldo/expedientes?${params.toString()}`
      );
      return data;
    },
    onSuccess: (response) => {
      if (!response.data || response.data.length === 0) {
        message.warning("No hay datos para exportar");
        return;
      }

      const csvConfig = mkConfig({
        useKeysAsHeaders: true,
        filename: `toldo_expedientes_${expStartDate}_${expEndDate}`,
      });

      const transformedData = response.data.map((item) => ({
        Código: `EX-${item.anio}-${item.numero}--GDEEBY-${item.codigo_reparticion_usuario}`,
        Descripción: item.descripcion || "",
        Estado: item.estado || "",
        "Tipo Documento": item.tipo_documento || "",
        Trámite: item.trata_nombre || "",
        "Fecha Creación": item.fecha_creacion
          ? format(parseISO(item.fecha_creacion), "dd/MM/yyyy HH:mm", {
              locale: esLocale,
            })
          : "",
        "Usuario Creador": item.usuario_creador || "",
        "Usuario Creación": item.usuario_creacion || "",
        Motivo: item.motivo || "",
        Año: item.anio?.toString() || "",
      }));

      const csv = generateCsv(csvConfig)(transformedData);
      download(csvConfig)(csv);
      message.success(`Se exportaron ${response.data.length} expedientes`);
    },
    onError: () => {
      message.error("Error al exportar los datos");
    },
  });

  // Fetch expedientes data
  const {
    data: expData,
    status: expStatus,
    isFetching: expIsFetching,
  } = useQuery({
    queryKey: [
      "toldo-expedientes",
      expPage,
      expPageSize,
      expStartDate,
      expEndDate,
      selectedTratas,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: expPage.toString(),
        pageSize: expPageSize.toString(),
      });

      if (expStartDate) params.append("startDate", expStartDate);
      if (expEndDate) params.append("endDate", expEndDate);
      if (selectedTratas.length > 0) {
        params.append("tratas", selectedTratas.join(","));
      }

      const { data } = await axios.get<ToldoExpedienteResponse>(
        `/api/toldo/expedientes?${params.toString()}`
      );
      return data;
    },
    enabled: Boolean(expStartDate && expEndDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleExpDateRangeChange: RangePickerProps["onChange"] = (dates) => {
    if (dates && dates[0] && dates[1]) {
      const [start, end] = dates;
      setExpDateRange({
        expStartDate: formatDateForAPI(start.toDate()),
        expEndDate: formatDateForAPI(end.toDate()),
      });
      setSelectedTratas([]); // Reset trata filters - new range may have different tratas
      setExpPage(1);
    }
  };

  const handleExpResetRange = () => {
    const [defaultStart, defaultEnd] = getDefaultDateRange();
    setExpDateRange({
      expStartDate: formatDateForAPI(defaultStart.toDate()),
      expEndDate: formatDateForAPI(defaultEnd.toDate()),
    });
    setSelectedTratas([]); // Reset trata filters
    setExpPage(1);
  };

  const showExpDrawer = () => {
    setOpenExpDrawer(true);
  };

  const onExpClose = () => {
    setOpenExpDrawer(false);
  };

  return (
    <>
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        {/* Filter Controls */}
        <Flex justify="center" align="center" gap="middle">
          <Space>
            <Text>Rango de fechas:</Text>
            <RangePicker
              value={[dayjs(expStartDate), dayjs(expEndDate)]}
              onChange={handleExpDateRangeChange}
              format="DD/MM/YYYY"
              placeholder={["Fecha inicio", "Fecha fin"]}
              presets={rangePresets}
              allowClear={false}
              showTime={false}
            />
            <Button variant="outlined" onClick={handleExpResetRange}>
              Restablecer
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => exportExpMutation.mutate()}
              loading={exportExpMutation.isPending}
              disabled={expIsFetching || !expData?.data?.length}
            >
              Exportar todo
            </Button>
          </Space>
        </Flex>

        {/* Total Expedientes Statistic */}
        {expData && expData.stats && expData.stats.totalExpedientes > 0 && (
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card
                size="small"
                style={{
                  borderLeft: `4px solid #1890ff`,
                  background: "linear-gradient(to right, #e6f4ff, #ffffff)",
                }}
                styles={{ body: { padding: "8px 10px" } }}
              >
                <Statistic
                  title="Total de Expedientes"
                  value={expData.stats.totalExpedientes}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Trata Type Statistics - Clickable Filters */}
        {expData &&
          expData.stats &&
          expData.stats.trataTypeStats.length > 0 && (
            <Row gutter={[4, 4]}>
              {expData.stats.trataTypeStats.map((stat, index) => {
                const colors = [
                  "#1890ff",
                  "#13c2c2",
                  "#2f54eb",
                  "#faad14",
                  "#52c41a",
                  "#fa8c16",
                  "#eb2f96",
                  "#722ed1",
                ];
                const color = colors[index % colors.length];
                const selected = isTratatypeSelected(stat.trata_nombre);
                return (
                  <Col span={4} key={stat.trata_nombre || index}>
                    <Card
                      size="small"
                      hoverable
                      onClick={() => toggleTratatypeFilter(stat.trata_nombre)}
                      style={{
                        borderLeft: `4px solid ${selected ? color : "#d9d9d9"}`,
                        opacity: selected ? 1 : 0.6,
                        cursor: "pointer",
                      }}
                      styles={{ body: { padding: "8px 10px" } }}
                    >
                      <Statistic
                        title={
                          <div style={{ lineHeight: "1.3" }}>
                            <Text
                              strong
                              style={{
                                fontSize: "11px",
                                color: selected ? undefined : "#8c8c8c",
                                display: "block",
                              }}
                            >
                              {stat.trata_codigo || "N/A"}
                            </Text>
                            <Text
                              ellipsis={{ tooltip: stat.trata_descripcion }}
                              style={{
                                fontSize: "10px",
                                color: selected ? "#8c8c8c" : "#a8a8a8",
                                display: "block",
                                marginTop: "2px",
                              }}
                            >
                              {stat.trata_descripcion || "Sin descripción"}
                            </Text>
                          </div>
                        }
                        value={stat.count}
                        valueStyle={{
                          fontSize: "16px",
                          color: selected ? color : "#8c8c8c",
                        }}
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}

        {/* Results List */}
        <Flex justify="start">
          <ConfigProvider
            renderEmpty={() => (
              <Empty
                description={
                  <span>
                    {expData?.data.length === 0
                      ? !allTratasSelected
                        ? "No hay expedientes con los trámites seleccionados"
                        : "No se encontraron expedientes en el rango de fechas seleccionado"
                      : "Cargando expedientes..."}
                  </span>
                }
              />
            )}
          >
            <List
              style={{ width: "100%" }}
              loading={expIsFetching}
              itemLayout="horizontal"
              dataSource={expData?.data || []}
              pagination={{
                onChange: (page) => {
                  setExpPage(page);
                },
                onShowSizeChange: (curr, size) => setExpPageSize(size),
                pageSize: expPageSize,
                total: expData?.pagination.totalCount,
                position: "bottom",
                showTotal: (total: number, range: number[]) =>
                  `Viendo ${range[0]}-${range[1]} de ${total} resultados${
                    !allTratasSelected ? " (filtrado)" : ""
                  }`,
                current: expPage,
                pageSizeOptions: ["7", "10", "20", "50"],
              }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <a
                      onClick={() => {
                        setSelectedExpediente(item);
                        showExpDrawer();
                      }}
                      key={`a-${item.id}`}
                    >
                      Ver detalles
                    </a>,
                  ]}
                >
                  <Skeleton
                    title={true}
                    loading={expStatus === "pending"}
                    active
                  >
                    <List.Item.Meta
                      title={
                        <Flex gap="small">
                          <a
                            href="#"
                            onClick={() => {
                              setSelectedExpediente(item);
                              showExpDrawer();
                            }}
                          >{`EX-${item.anio}-${item.numero}--GDEEBY-${item.codigo_reparticion_usuario}`}</a>
                          <Badge status="default" text={item.estado} />
                          {item.trata_descripcion && (
                            <Tag color="blue">{item.trata_descripcion}</Tag>
                          )}
                        </Flex>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text
                            ellipsis={{ tooltip: item.descripcion }}
                            style={{ maxWidth: "600px" }}
                          >
                            {item.descripcion}
                          </Text>
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            Caratulado por: {item.usuario_creador} - Fecha:{" "}
                            {format(parseISO(item.fecha_creacion), "PPP", {
                              locale: esLocale,
                            })}
                          </Text>
                        </Space>
                      }
                    />
                  </Skeleton>
                </List.Item>
              )}
            />
          </ConfigProvider>
        </Flex>
      </Space>

      <Drawer
        title="Detalles del expediente"
        onClose={onExpClose}
        open={openExpDrawer}
        width={700}
      >
        {selectedExpediente && (
          <Flex vertical gap="middle">
            <Descriptions
              bordered
              size="small"
              items={[
                {
                  label: "Código",
                  children: (
                    <Flex gap="small" align="center">
                      <Paragraph
                        style={{ marginBottom: 0 }}
                        copyable
                      >{`EX-${selectedExpediente.anio}-${selectedExpediente.numero}--GDEEBY-${selectedExpediente.codigo_reparticion_usuario}`}</Paragraph>
                      <Button
                        color="primary"
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          router.push(`/movimientos/${selectedExpediente.id}`)
                        }
                      >
                        Ver movimientos
                      </Button>
                    </Flex>
                  ),
                  span: 3,
                },
                {
                  label: "Estado",
                  children: (
                    <Badge status="default" text={selectedExpediente.estado} />
                  ),
                  span: 3,
                },
                {
                  label: "Tipo Documento",
                  children: (
                    <Tag color="geekblue">
                      {selectedExpediente.tipo_documento}
                    </Tag>
                  ),
                  span: 3,
                },
                {
                  label: "Trámite",
                  children: selectedExpediente.trata_nombre || "N/A",
                  span: 3,
                },
                {
                  label: "Descripción",
                  children: selectedExpediente.descripcion,
                  span: 3,
                },
                {
                  label: "Usuario Creador",
                  children: selectedExpediente.usuario_creador,
                  span: 3,
                },
                {
                  label: "Solicitado por",
                  children: selectedExpediente.usuario_creacion,
                  span: 3,
                },
                {
                  label: "Fecha Creación",
                  children: format(
                    parseISO(selectedExpediente.fecha_creacion.split("T")[0]),
                    "P",
                    {
                      locale: esLocale,
                    }
                  ),
                  span: 3,
                },
                {
                  label: "Fecha Modificación",
                  children: selectedExpediente.fecha_modificacion
                    ? format(
                        parseISO(
                          selectedExpediente.fecha_modificacion.split("T")[0]
                        ),
                        "P",
                        {
                          locale: esLocale,
                        }
                      )
                    : "N/A",
                  span: 3,
                },
                {
                  label: "Motivo",
                  children: selectedExpediente.motivo,
                  span: 3,
                },
              ]}
            />
          </Flex>
        )}
      </Drawer>
    </>
  );
}
