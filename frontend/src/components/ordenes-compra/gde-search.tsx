import {
  Button,
  DatePicker,
  Flex,
  Select,
  Space,
  Typography,
  List,
  Skeleton,
  Tag,
  Drawer,
  Descriptions,
  ConfigProvider,
  Empty,
  Input,
} from "antd";
import { useEffect, useState } from "react";
import { useDebouncedState } from "@react-hookz/web";
import { DownloadOutlined, FileExcelOutlined } from "@ant-design/icons";
import { formatDateForAPI, sanitizeCSVField } from "@/utils";
import {
  parseAsString,
  parseAsInteger,
  useQueryState,
  useQueryStates,
} from "nuqs";
import dayjs from "dayjs";
import { RangePickerProps } from "antd/es/date-picker";
import { getDefaultDateRange, rangePresets } from "@/utils/date-range";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { message } from "antd";
import { downloadBlob, parseDocumentNumber } from "@/utils";
import { renderMotivoWithOCLink } from "@/utils/oc-extraction";
import { mkConfig, generateCsv, download } from "export-to-csv";

type Reparticion = {
  CODIGO_REPARTICION: string;
  NOMBRE_REPARTICION: string;
};

type OrdenCompraResult = {
  numero: string;
  motivo: string;
  usuariogenerador: string;
  datos_usuario: string;
  anio: number;
  fechacreacion: string;
  total_count: string;
  tipo_documento: string;
  reparticion: string;
};

interface OrdenCompraDocResponse {
  data: OrdenCompraResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const { Text, Paragraph } = Typography;

export function GDESearch() {
  const defaultRange = getDefaultDateRange();
  const [{ startDate, endDate, searchQuery, reparticiones }, setParams] =
    useQueryStates({
      startDate: parseAsString,
      endDate: parseAsString,
      searchQuery: parseAsString.withDefault(""),
      reparticiones: parseAsString.withDefault(""),
    });

  const resolvedStartDate =
    startDate ?? formatDateForAPI(defaultRange[0].toDate());
  const resolvedEndDate = endDate ?? formatDateForAPI(defaultRange[1].toDate());

  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(10),
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // const { data: reparticionesData } = useQuery({
  //   queryKey: ["reparticiones"],
  //   queryFn: async () => {
  //     const { data } = await axios.get<Reparticion[]>(
  //       "/api/ordenes-compra/reparticiones",
  //     );
  //     return data;
  //   },
  //   staleTime: Infinity,
  // });

  // const selectedReparticiones = reparticiones
  //   ? reparticiones.split(",").filter(Boolean)
  //   : [];

  // const handleReparticionChange = (values: string[]) => {
  //   setParams({ reparticiones: values.join(","), searchQuery: "" });
  //   setSearchInput("");
  //   setDebouncedSearchQuery("");
  //   setPage(1);
  // };

  const handleDateRangeChange: RangePickerProps["onChange"] = (dates) => {
    if (dates && dates[0] && dates[1]) {
      const [start, end] = dates;
      setParams({
        startDate: formatDateForAPI(start.toDate()),
        endDate: formatDateForAPI(end.toDate()),
        reparticiones: "",
        searchQuery: "",
      });
      setSearchInput("");
      setDebouncedSearchQuery("");
      setPage(1);
    }
  };

  const handleResetRange = () => {
    setParams({
      startDate: null,
      endDate: null,
      reparticiones: "",
      searchQuery: "",
    });
    setSearchInput("");
    setDebouncedSearchQuery("");
    setPage(1);
  };

  const [searchInput, setSearchInput] = useState<string>(searchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useDebouncedState(
    searchQuery,
    400,
  );

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) {
      setParams({ searchQuery: debouncedSearchQuery });
      setPage(1);
    }
  }, [debouncedSearchQuery, searchQuery, setParams, setPage]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setDebouncedSearchQuery(value);
  };

  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrdenCompraResult | null>(
    null,
  );

  const showDrawer = () => {
    setOpenDrawer(true);
  };

  const onClose = () => {
    setOpenDrawer(false);
  };

  const {
    data: dataOrdenCompra,
    status: statusOrdenCompra,
    isFetching: isFetchingOrdenCompra,
  } = useQuery({
    queryKey: [
      "ordenes-compra",
      page,
      pageSize,
      startDate,
      endDate,
      // selectedReparticiones,
      debouncedSearchQuery,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (debouncedSearchQuery)
        params.append("searchQuery", debouncedSearchQuery);
      if (resolvedStartDate) params.append("startDate", resolvedStartDate);
      if (resolvedEndDate) params.append("endDate", resolvedEndDate);
      // if (selectedReparticiones.length > 0) {
      //   params.append("reparticiones", selectedReparticiones.join(","));
      // }

      const { data } = await axios.get<OrdenCompraDocResponse>(
        `/api/ordenes-compra?${params.toString()}`,
      );
      return data;
    },
    enabled: Boolean(resolvedStartDate && resolvedEndDate),
    staleTime: 1000 * 60 * 5,
  });

  const downloadDocMutation = useMutation({
    mutationFn: async (docResult: OrdenCompraResult) => {
      const { type, year, number, system, location } = parseDocumentNumber(
        docResult.numero,
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

      const fileResponse = await fetch(
        `/api/documents?path=${encodeURIComponent(resDoc.data.url)}`,
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
            "El documento aun no se encuentra disponible para descargar",
          );
        } else {
          message.error("Ocurrió un error al intentar descargar el archivo");
        }
      }
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "5000",
      });

      if (debouncedSearchQuery) {
        params.append("searchQuery", debouncedSearchQuery);
      }
      if (resolvedStartDate) params.append("startDate", resolvedStartDate);
      if (resolvedEndDate) params.append("endDate", resolvedEndDate);

      const { data } = await axios.get<OrdenCompraDocResponse>(
        `/api/ordenes-compra?${params.toString()}`,
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
        filename: `ordenes_compra_${resolvedStartDate}_${resolvedEndDate}`,
      });

      const transformedData = response.data.map((item) => ({
        Numero: sanitizeCSVField(item.numero),
        "Tipo Documento": sanitizeCSVField(item.tipo_documento),
        Motivo: sanitizeCSVField(item.motivo),
        "Fecha Creacion": item.fechacreacion
          ? format(parseISO(item.fechacreacion), "dd/MM/yyyy HH:mm", {
              locale: esLocale,
            })
          : "",
        Anio: item.anio?.toString() || "",
        Reparticion: sanitizeCSVField(item.reparticion),
        "Usuario Generador": sanitizeCSVField(item.usuariogenerador),
        "Datos Usuario": sanitizeCSVField(item.datos_usuario),
      }));

      const csv = generateCsv(csvConfig)(transformedData);
      download(csvConfig)(csv);
      message.success(
        `Se exportaron ${response.data.length} ordenes de compra`,
      );
    },
    onError: () => {
      message.error("Error al exportar los datos");
    },
  });

  return (
    <Flex justify="center" align="center" gap="middle" vertical>
      <Space>
        <Text>Buscar:</Text>
        <Input.Search
          placeholder="Palabras clave"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onSearch={() => setPage(1)}
          style={{ width: 200 }}
          allowClear
        />
        <Text>Rango de fechas:</Text>
        <DatePicker.RangePicker
          value={[dayjs(resolvedStartDate), dayjs(resolvedEndDate)]}
          onChange={handleDateRangeChange}
          format="DD/MM/YYYY"
          placeholder={["Fecha inicio", "Fecha fin"]}
          presets={rangePresets}
          allowClear={false}
          showTime={false}
        />
        {/* <Select
          mode="multiple"
          style={{ minWidth: 180 }}
          placeholder="Reparticiones"
          value={selectedReparticiones}
          onChange={handleReparticionChange}
          options={reparticionesData
            ?.sort((a: Reparticion, b: Reparticion) =>
              a.CODIGO_REPARTICION.localeCompare(b.CODIGO_REPARTICION),
            )
            .map((rep: Reparticion) => ({
              label: rep.CODIGO_REPARTICION,
              value: rep.CODIGO_REPARTICION,
            }))}
        /> */}
        <Button variant="outlined" onClick={handleResetRange}>
          Restablecer
        </Button>
        <Button
          icon={<FileExcelOutlined />}
          onClick={() => exportMutation.mutate()}
          loading={exportMutation.isPending}
          disabled={isFetchingOrdenCompra || !dataOrdenCompra?.data?.length}
        >
          Exportar todo
        </Button>
      </Space>
      <Flex vertical gap="middle" style={{ width: "100%", marginTop: 16 }}>
        <ConfigProvider
          renderEmpty={() => (
            <Empty
              description={
                <span>
                  {dataOrdenCompra?.data.length === 0
                    ? searchQuery
                      ? `No se encontraron órdenes de compra para "${searchQuery}"`
                      : "No se encontraron órdenes de compra en el rango de fechas seleccionado"
                    : "Cargando órdenes de compra..."}
                </span>
              }
            />
          )}
        >
          <List
            style={{ width: "100%" }}
            loading={isFetchingOrdenCompra}
            itemLayout="horizontal"
            dataSource={dataOrdenCompra?.data || []}
            pagination={{
              onChange: (page) => {
                setPage(page);
              },
              onShowSizeChange: (curr, size) => setPageSize(size),
              pageSize: pageSize,
              total: dataOrdenCompra?.pagination.totalCount,
              position: "bottom",
              showTotal: (total: number, range: number[]) =>
                `Viendo ${range[0]}-${range[1]} de ${total} resultados`,
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
                  loading={statusOrdenCompra === "pending"}
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
                        <Tag color="blue">{item.tipo_documento}</Tag>
                      </Flex>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        <Text
                          ellipsis={{ tooltip: true }}
                          style={{ maxWidth: "600px" }}
                        >
                          {renderMotivoWithOCLink(item.motivo)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          Fecha:{" "}
                          {item.fechacreacion
                            ? format(parseISO(item.fechacreacion), "PPP", {
                                locale: esLocale,
                              })
                            : "N/A"}
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
      <Drawer
        title="Detalles de la orden de compra"
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
                  children: selectedItem.fechacreacion
                    ? format(parseISO(selectedItem.fechacreacion), "PPP", {
                        locale: esLocale,
                      })
                    : "N/A",
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
                  label: "Repartición",
                  children: (
                    <Tag color="purple">{selectedItem.reparticion}</Tag>
                  ),
                  span: 3,
                },
                {
                  label: "Motivo",
                  children: renderMotivoWithOCLink(selectedItem.motivo),
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
              ]}
            />
          </Flex>
        )}
      </Drawer>
    </Flex>
  );
}
