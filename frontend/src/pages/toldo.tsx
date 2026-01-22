import React from "react";
import { MainLayout } from "../components/MainLayout";
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
  TimeRangePickerProps,
  Statistic,
  Select,
  Tabs,
} from "antd";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import axios from "axios";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ToldoDocResponse, ToldoDocResult } from "./api/toldo";
import { UsersByLocationResponse } from "./api/toldo/users";
import {
  ToldoExpedienteResponse,
  ToldoExpedienteResult,
} from "./api/toldo/expedientes";
import { useRouter } from "next/router";
import { DownloadOutlined, FileExcelOutlined } from "@ant-design/icons";
import {
  parseAsString,
  parseAsInteger,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { canAccessMesas, canSearchDocs } from "@/utils/featureGuards";
import { message } from "antd";
import { downloadBlob, formatDateForAPI, parseDocumentNumber } from "@/utils";
import dayjs from "dayjs";
import type { RangePickerProps } from "antd/es/date-picker";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// Default to today and yesterday (2 full days)
const getDefaultDateRange = (): [dayjs.Dayjs, dayjs.Dayjs] => {
  const startDate = dayjs().subtract(1, "day").startOf("day");
  const endDate = dayjs();
  return [startDate, endDate];
};

const rangePresets: TimeRangePickerProps["presets"] = [
  {
    label: "Hoy y ayer",
    value: () => [dayjs().subtract(1, "day").startOf("day"), dayjs()],
  },
  {
    label: "Ultimas 24 horas",
    value: () => [dayjs().subtract(24, "hour"), dayjs()],
  },
  {
    label: "Ultimos 7 Dias",
    value: () => [dayjs().subtract(7, "day"), dayjs()],
  },
  {
    label: "Ultimos 14 Dias",
    value: () => [dayjs().subtract(14, "day"), dayjs()],
  },
  {
    label: "Ultimos 30 Dias",
    value: () => [dayjs().subtract(30, "day"), dayjs()],
  },
  {
    label: "Ultimos 90 Dias",
    value: () => [dayjs().subtract(90, "day"), dayjs()],
  },
  { label: "Este año", value: () => [dayjs().startOf("year"), dayjs()] },
];

function ExpedientesTab() {
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

export default function ToldoPage() {
  const router = useRouter();

  const [openDrawer, setOpenDrawer] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<ToldoDocResult | null>(
    null
  );

  // URL state
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(10)
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const defaultRange = getDefaultDateRange();
  const [{ startDate, endDate }, setDateRange] = useQueryStates({
    startDate: parseAsString.withDefault(
      formatDateForAPI(defaultRange[0].toDate())
    ),
    endDate: parseAsString.withDefault(
      formatDateForAPI(defaultRange[1].toDate())
    ),
  });

  // Document type filter state (empty array means all selected)
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const allTypesSelected = selectedTypes.length === 0;

  // Location filter state ("all" means all locations)
  const [selectedLocations, setSelectedLocations] = React.useState<string[]>([
    "all",
  ]);

  // Fetch users by location for filtering
  const { data: usersByLocation } = useQuery({
    queryKey: ["toldo-users-by-location"],
    queryFn: async () => {
      const { data } =
        await axios.get<UsersByLocationResponse>("/api/toldo/users");
      return data;
    },
    staleTime: 1000 * 60 * 60 * 8, // 8 hours
  });

  // Get users to filter by based on selected locations
  const usersToFilter = React.useMemo(() => {
    if (selectedLocations.includes("all") || !usersByLocation) {
      return [];
    }
    const users: string[] = [];
    if (selectedLocations.includes("POS"))
      users.push(...(usersByLocation.POS || []));
    if (selectedLocations.includes("ITU"))
      users.push(...(usersByLocation.ITU || []));
    if (selectedLocations.includes("BUE"))
      users.push(...(usersByLocation.BUE || []));
    return [...new Set(users)]; // Remove duplicates
  }, [selectedLocations, usersByLocation]);

  // Handle location selection change
  const handleLocationChange = (values: string[]) => {
    if (values.includes("all") && !selectedLocations.includes("all")) {
      // If "all" is newly selected, clear other selections
      setSelectedLocations(["all"]);
    } else if (values.length === 0) {
      // If nothing selected, default to "all"
      setSelectedLocations(["all"]);
    } else {
      // Remove "all" if other options are selected
      setSelectedLocations(values.filter((v) => v !== "all"));
    }
    setPage(1);
  };

  // Toggle a document type filter
  const toggleDocTypeFilter = (tipo: string) => {
    if (allTypesSelected && data?.stats?.docTypeStats) {
      // First click when all selected: deselect only this type (select all others)
      const allTypes = data.stats.docTypeStats.map((s) => s.tipo_documento);
      setSelectedTypes(allTypes.filter((t) => t !== tipo));
    } else if (selectedTypes.includes(tipo)) {
      // Deselect this type
      setSelectedTypes(selectedTypes.filter((t) => t !== tipo));
    } else {
      // Add this type to selection
      setSelectedTypes([...selectedTypes, tipo]);
    }
    setPage(1);
  };

  // Check if a type is selected
  const isTypeSelected = (tipo: string) =>
    allTypesSelected || selectedTypes.includes(tipo);

  // Download mutation
  const downloadDocMutation = useMutation({
    mutationFn: async (docResult: ToldoDocResult) => {
      const { type, year, number, system, location } = parseDocumentNumber(
        docResult.numero
      );

      const resDoc = await axios.get("/api/documents/check", {
        params: {
          type,
          year,
          number,
          system,
          location,
        },
      });

      // Fetch the file as a Blob
      const fileResponse = await fetch(
        `/api/documents?path=${encodeURIComponent(resDoc.data.url)}`
      );
      if (!fileResponse.ok) throw new Error("No se pudo descargar el archivo");
      const blob = await fileResponse.blob();

      const fileName = `${docResult.numero}.pdf`;
      return { blob, fileName };
    },
    onSuccess: ({ blob, fileName }) => {
      downloadBlob(blob, fileName);
      message.success("Documento descargado exitosamente");
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          message.warning(
            "El documento aun no se encuentra disponible para descargar"
          );
        } else {
          message.error("Ocurrió un error al intentar descargar el archivo");
        }
      }
    },
  });

  // Export all data mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "5000",
      });

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedTypes.length > 0) {
        params.append("tipos", selectedTypes.join(","));
      }
      if (usersToFilter.length > 0) {
        params.append("usuarios", usersToFilter.join(","));
      }

      const { data } = await axios.get<ToldoDocResponse>(
        `/api/toldo?${params.toString()}`
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
        filename: `toldo_documentos_${startDate}_${endDate}`,
      });

      const transformedData = response.data.map((item) => ({
        Número: item.numero || "",
        "Tipo Documento": item.tipo_documento || "",
        Motivo: item.motivo || "",
        "Fecha Creación": item.fechacreacion
          ? format(parseISO(item.fechacreacion), "dd/MM/yyyy HH:mm", {
              locale: esLocale,
            })
          : "",
        Año: item.anio?.toString() || "",
        "Usuario Generador": item.usuariogenerador || "",
        "Datos Usuario": item.datos_usuario || "",
        "Total Expedientes": item.total_expedientes?.toString() || "0",
        "Expedientes Asociados": item.expedientes_asociados || "",
      }));

      const csv = generateCsv(csvConfig)(transformedData);
      download(csvConfig)(csv);
      message.success(`Se exportaron ${response.data.length} documentos`);
    },
    onError: () => {
      message.error("Error al exportar los datos");
    },
  });

  // Fetch data
  const { data, status, isFetching } = useQuery({
    queryKey: [
      "toldo-docs",
      page,
      pageSize,
      startDate,
      endDate,
      selectedTypes,
      usersToFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedTypes.length > 0) {
        params.append("tipos", selectedTypes.join(","));
      }
      if (usersToFilter.length > 0) {
        params.append("usuarios", usersToFilter.join(","));
      }

      const { data } = await axios.get<ToldoDocResponse>(
        `/api/toldo?${params.toString()}`
      );
      return data;
    },
    enabled: Boolean(startDate && endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleDateRangeChange: RangePickerProps["onChange"] = (dates) => {
    if (dates && dates[0] && dates[1]) {
      const [start, end] = dates;
      setDateRange({
        startDate: formatDateForAPI(start.toDate()),
        endDate: formatDateForAPI(end.toDate()),
      });
      setSelectedTypes([]); // Reset type filters - new range may have different types
      setSelectedLocations(["all"]); // Reset location filter
      setPage(1);
    }
  };

  const handleResetRange = () => {
    const [defaultStart, defaultEnd] = getDefaultDateRange();
    setDateRange({
      startDate: formatDateForAPI(defaultStart.toDate()),
      endDate: formatDateForAPI(defaultEnd.toDate()),
    });
    setSelectedTypes([]); // Reset type filters
    setSelectedLocations(["all"]); // Reset location filter
    setPage(1);
  };

  const showDrawer = () => {
    setOpenDrawer(true);
  };

  const onClose = () => {
    setOpenDrawer(false);
  };

  return (
    <MainLayout>
      <Row gutter={16} justify="center" style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space direction="vertical">
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              Tablero Online de Documentos - Mesa de Entradas
            </Typography.Title>
          </Space>
        </Col>
      </Row>
      <Row gutter={[16, 16]} justify="center">
        <Card style={{ minHeight: "calc(100dvh - 210px)", width: "100%" }}>
          <Tabs
            defaultActiveKey="documentos"
            items={[
              {
                key: "documentos",
                label: "Documentos",
                children: (
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ display: "flex" }}
                  >
                    {/* Filter Controls */}
                    <Flex justify="center" align="center" gap="middle">
                      <Space>
                        <Text>Rango de fechas:</Text>
                        <RangePicker
                          value={[dayjs(startDate), dayjs(endDate)]}
                          onChange={handleDateRangeChange}
                          format="DD/MM/YYYY"
                          placeholder={["Fecha inicio", "Fecha fin"]}
                          presets={rangePresets}
                          allowClear={false}
                          showTime={false}
                        />
                        <Select
                          mode="multiple"
                          style={{ minWidth: 180 }}
                          placeholder="Sede"
                          value={selectedLocations}
                          onChange={handleLocationChange}
                          options={[
                            { value: "all", label: "Todas las sedes" },
                            { value: "POS", label: "Posadas" },
                            { value: "ITU", label: "Ituzaingo" },
                            { value: "BUE", label: "Buenos Aires" },
                          ]}
                        />
                        <Button variant="outlined" onClick={handleResetRange}>
                          Restablecer
                        </Button>
                        <Button
                          icon={<FileExcelOutlined />}
                          onClick={() => exportMutation.mutate()}
                          loading={exportMutation.isPending}
                          disabled={isFetching || !data?.data?.length}
                        >
                          Exportar todo
                        </Button>
                      </Space>
                    </Flex>

                    {/* Expediente Percentage Statistic */}
                    {data &&
                      data.stats &&
                      data.stats.totalDocs > 0 &&
                      (() => {
                        const pct = data.stats.percentageWithExpediente;
                        // Color ranges: <=30% red, >30-70% orange, >70-<100% blue, 100% green
                        const getPercentageColor = (percentage: number) => {
                          if (percentage === 100) return "#52c41a"; // green
                          if (percentage > 70) return "#1890ff"; // blue
                          if (percentage > 30) return "#fa8c16"; // orange
                          return "#f5222d"; // red
                        };
                        const color = getPercentageColor(pct);
                        const bgGradients: Record<string, string> = {
                          "#52c41a":
                            "linear-gradient(to right, #f6ffed, #ffffff)",
                          "#1890ff":
                            "linear-gradient(to right, #e6f4ff, #ffffff)",
                          "#fa8c16":
                            "linear-gradient(to right, #fff7e6, #ffffff)",
                          "#f5222d":
                            "linear-gradient(to right, #fff1f0, #ffffff)",
                        };
                        return (
                          <Row gutter={[16, 16]}>
                            <Col span={6}>
                              <Card
                                size="small"
                                style={{
                                  borderLeft: `4px solid ${color}`,
                                  background: bgGradients[color],
                                }}
                                styles={{ body: { padding: "8px 10px" } }}
                              >
                                <Statistic
                                  title="Documentos con Expedientes asociados"
                                  value={pct}
                                  suffix="%"
                                  precision={0}
                                  valueStyle={{ color }}
                                />
                                <Text
                                  type="secondary"
                                  style={{ fontSize: "12px" }}
                                >
                                  {data.stats.docsWithExpediente} de{" "}
                                  {data.stats.totalDocs} documentos
                                </Text>
                              </Card>
                            </Col>
                          </Row>
                        );
                      })()}

                    {/* Document Type Statistics - Clickable Filters */}
                    {data &&
                      data.stats &&
                      data.stats.docTypeStats.length > 0 && (
                        <Row gutter={[4, 4]}>
                          {data.stats.docTypeStats.map((stat, index) => {
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
                            const selected = isTypeSelected(
                              stat.tipo_documento
                            );
                            return (
                              <Col span={4} key={stat.tipo_documento || index}>
                                <Card
                                  size="small"
                                  hoverable
                                  onClick={() =>
                                    toggleDocTypeFilter(stat.tipo_documento)
                                  }
                                  style={{
                                    borderLeft: `4px solid ${
                                      selected ? color : "#d9d9d9"
                                    }`,
                                    opacity: selected ? 1 : 0.6,
                                    cursor: "pointer",
                                  }}
                                  styles={{ body: { padding: "8px 10px" } }}
                                >
                                  <Statistic
                                    title={
                                      <Text
                                        style={{
                                          fontSize: "11px",
                                          color: selected
                                            ? undefined
                                            : "#8c8c8c",
                                        }}
                                      >
                                        {stat.tipo_documento}
                                      </Text>
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
                                {data?.data.length === 0
                                  ? !allTypesSelected
                                    ? "No hay documentos con los tipos seleccionados"
                                    : "No se encontraron documentos en el rango de fechas seleccionado"
                                  : "Cargando documentos..."}
                              </span>
                            }
                          />
                        )}
                      >
                        <List
                          style={{ width: "100%" }}
                          loading={isFetching}
                          itemLayout="horizontal"
                          dataSource={data?.data || []}
                          pagination={{
                            onChange: (page) => {
                              setPage(page);
                            },
                            onShowSizeChange: (curr, size) => setPageSize(size),
                            pageSize: pageSize,
                            total: data?.pagination.totalCount,
                            position: "bottom",
                            showTotal: (total: number, range: number[]) =>
                              `Viendo ${range[0]}-${range[1]} de ${total} resultados${
                                !allTypesSelected ? " (filtrado)" : ""
                              }`,
                            current: page,
                            pageSizeOptions: ["7", "10", "20", "50"],
                          }}
                          renderItem={(item) => (
                            <List.Item
                              actions={[
                                <a
                                  onClick={() => {
                                    setSelectedItem(item);
                                    showDrawer();
                                  }}
                                  key={`a-${item.numero}`}
                                >
                                  Ver detalles
                                </a>,
                              ]}
                            >
                              <Skeleton
                                title={true}
                                loading={status === "pending"}
                                active
                              >
                                <List.Item.Meta
                                  title={
                                    <Flex gap="small">
                                      <a
                                        href="#"
                                        onClick={() => {
                                          setSelectedItem(item);
                                          showDrawer();
                                        }}
                                      >
                                        {item.numero}
                                      </a>
                                      <Tag color="blue">
                                        {item.tipo_documento}
                                      </Tag>
                                    </Flex>
                                  }
                                  description={
                                    <Space direction="vertical" size={2}>
                                      <Text
                                        ellipsis={{ tooltip: item.motivo }}
                                        style={{ maxWidth: "600px" }}
                                      >
                                        {item.motivo}
                                      </Text>
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                      >
                                        Generado por: {item.datos_usuario} -
                                        Fecha:{" "}
                                        {format(
                                          parseISO(item.fechacreacion),
                                          "PPP",
                                          {
                                            locale: esLocale,
                                          }
                                        )}
                                      </Text>
                                      {item.total_expedientes > 0 && (
                                        <Text
                                          type="secondary"
                                          style={{ fontSize: "12px" }}
                                        >
                                          <Badge
                                            count={item.total_expedientes}
                                            size="small"
                                            style={{
                                              backgroundColor: "#1890ff",
                                            }}
                                          />{" "}
                                          Expediente
                                          {item.total_expedientes > 1
                                            ? "s"
                                            : ""}{" "}
                                          asociado
                                          {item.total_expedientes > 1
                                            ? "s"
                                            : ""}
                                        </Text>
                                      )}
                                      {item.total_expedientes === 0 && (
                                        <Tag color="orange">
                                          Sin expedientes asociados
                                        </Tag>
                                      )}
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
                ),
              },
              {
                key: "expedientes",
                label: "Expedientes",
                children: <ExpedientesTab />,
              },
            ]}
          />
        </Card>
      </Row>
      <Drawer
        title="Detalles del documento"
        onClose={onClose}
        open={openDrawer}
        width={600}
        extra={
          selectedItem && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloadDocMutation.isPending}
              onClick={() => downloadDocMutation.mutate(selectedItem)}
            >
              Descargar
            </Button>
          )
        }
      >
        {selectedItem && (
          <Flex vertical gap="middle">
            <Descriptions
              bordered
              size="small"
              items={[
                {
                  label: "Número",
                  children: (
                    <Paragraph style={{ marginBottom: 0 }} copyable>
                      {selectedItem.numero}
                    </Paragraph>
                  ),
                  span: 3,
                },
                {
                  label: "Año",
                  children: selectedItem.anio,
                  span: 3,
                },
                {
                  label: "Fecha de creación",
                  children: format(
                    parseISO(selectedItem.fechacreacion),
                    "PPP",
                    { locale: esLocale }
                  ),
                  span: 3,
                },
                {
                  label: "Tipo",
                  children: (
                    <Tag color="blue">{selectedItem.tipo_documento}</Tag>
                  ),
                  span: 3,
                },
                {
                  label: "Motivo",
                  children: selectedItem.motivo,
                  span: 3,
                },
                {
                  label: "Usuario Generador",
                  children: selectedItem.usuariogenerador,
                  span: 3,
                },
                {
                  label: "Datos de Usuario",
                  children: selectedItem.datos_usuario,
                  span: 3,
                },
                {
                  label: "Expedientes Asociados",
                  children:
                    selectedItem.total_expedientes > 0 ? (
                      <Space
                        direction="vertical"
                        size="small"
                        style={{ width: "100%" }}
                      >
                        <Badge
                          count={selectedItem.total_expedientes}
                          size="small"
                          style={{ backgroundColor: "#1890ff" }}
                        />
                        {selectedItem.expedientes_asociados &&
                          selectedItem.expedientes_ids && (
                            <div
                              style={{
                                maxHeight: "100px",
                                overflowY: "auto",
                                fontSize: "12px",
                              }}
                            >
                              {selectedItem.expedientes_asociados
                                .split(", ")
                                .map((exp, index) => {
                                  const expedienteIds =
                                    selectedItem.expedientes_ids?.split(", ") ||
                                    [];
                                  const expedienteId = expedienteIds[index];

                                  return expedienteId ? (
                                    <Tag
                                      key={index}
                                      color="blue"
                                      style={{
                                        marginBottom: "4px",
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        router.push(
                                          `/movimientos/${expedienteId}`
                                        )
                                      }
                                    >
                                      {exp}
                                    </Tag>
                                  ) : (
                                    <Tag
                                      key={index}
                                      color="blue"
                                      style={{ marginBottom: "4px" }}
                                    >
                                      {exp}
                                    </Tag>
                                  );
                                })}
                            </div>
                          )}
                      </Space>
                    ) : (
                      <Text type="secondary">Sin expedientes asociados</Text>
                    ),
                  span: 3,
                },
              ]}
            />
          </Flex>
        )}
      </Drawer>
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

  const canAccess = canAccessMesas(session.role);

  if (!canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
