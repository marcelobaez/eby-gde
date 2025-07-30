import React from "react";
import { MainLayout } from "../components/MainLayout";
import {
  Card,
  Col,
  Row,
  Typography,
  Space,
  List,
  Skeleton,
  ConfigProvider,
  Empty,
  DatePicker,
  Button,
  Flex,
  Tag,
} from "antd";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import axios from "axios";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  SignedDocumentsResponse,
  SignedDocumentResult,
} from "./api/gdesignedbyme";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { RangePickerProps } from "antd/es/date-picker";
import type { Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const rangePresets: RangePickerProps["presets"] = [
  { label: "Ultimos 7 Dias", value: () => [dayjs().add(-7, "d"), dayjs()] },
  { label: "Ultimos 14 Dias", value: () => [dayjs().add(-14, "d"), dayjs()] },
  { label: "Ultimos 30 Dias", value: () => [dayjs().add(-30, "d"), dayjs()] },
  { label: "Ultimos 90 Dias", value: () => [dayjs().add(-90, "d"), dayjs()] },
  {
    label: "Este año",
    value: () => [dayjs().startOf("year"), dayjs().endOf("year")],
  },
  {
    label: "El año pasado",
    value: () => [
      dayjs().subtract(1, "year").startOf("year"),
      dayjs().subtract(1, "year").endOf("year"),
    ],
  },
];

// Helper function to format dates for API
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Utility function to trigger a download from a Blob
function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Parse document number to extract components
function parseDocumentNumber(numero: string) {
  const parts = numero.split("-");
  if (parts.length < 5) {
    throw new Error("Invalid document number format");
  }

  return {
    type: parts[0],
    year: parts[1],
    number: parseInt(parts[2], 10).toString(), // Remove leading zeros
    system: parts[3],
    location: parts[4],
  };
}

// Get default date range (last month)
const getDefaultDateRange = (): [Dayjs, Dayjs] => {
  const endDate = dayjs().endOf("year");
  const startDate = dayjs().startOf("year");
  return [startDate, endDate];
};

export default function MisDocumentosPage() {
  // Download mutation
  const downloadDocMutation = useMutation({
    mutationFn: async (docResult: SignedDocumentResult) => {
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
    onError: () => {
      message.error(
        "Ocurrió un error al intentar descargar el archivo. Por favor, intente nuevamente."
      );
    },
  });

  // URL state for pagination
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(15)
  );

  const defaultRange = getDefaultDateRange();
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [startDate, setStartDate] = useQueryState(
    "startDate",
    parseAsString.withDefault(formatDateForAPI(defaultRange[0].toDate()))
  );
  const [endDate, setEndDate] = useQueryState(
    "endDate",
    parseAsString.withDefault(formatDateForAPI(defaultRange[1].toDate()))
  );

  // Fetch data
  const { data, status, isFetching } = useQuery({
    queryKey: ["signed-documents", page, pageSize, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const { data } = await axios.get<SignedDocumentsResponse>(
        `/api/gdesignedbyme?${params.toString()}`
      );
      return data;
    },
    enabled: Boolean(startDate && endDate),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  const handleDateRangeChange: RangePickerProps["onChange"] = (dates) => {
    if (dates && dates[0] && dates[1]) {
      const [start, end] = dates;
      setStartDate(formatDateForAPI(start.toDate()));
      setEndDate(formatDateForAPI(end.toDate()));
      setPage(1); // Reset to first page when dates change
    } else {
      // Handle clearing the date range
      setStartDate(null);
      setEndDate(null);
    }
  };

  const handleResetRange = () => {
    const [defaultStart, defaultEnd] = getDefaultDateRange();
    setStartDate(formatDateForAPI(defaultStart.toDate()));
    setEndDate(formatDateForAPI(defaultEnd.toDate()));
    setPage(1); // Reset to first page when range is reset
  };

  return (
    <MainLayout>
      <Row gutter={16} justify="center" style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space direction="vertical">
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              Documentos Firmados por Mí
            </Typography.Title>
            <Typography.Text type="secondary">
              Consulte los documentos que ha firmado en el sistema GDE. Por
              defecto vera los documentos firmados{" "}
              <strong>{`en el último año`}</strong>.
            </Typography.Text>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} justify="center">
        <Card style={{ minHeight: "calc(100dvh - 210px)", width: "100%" }}>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
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
                />
                <Button variant="outlined" onClick={handleResetRange}>
                  Restablecer
                </Button>
              </Space>
            </Flex>

            {/* Results List */}
            <Flex justify="start">
              <ConfigProvider
                renderEmpty={() => (
                  <Empty
                    description={
                      <span>
                        {data?.data.length === 0
                          ? "No se encontraron documentos firmados en el rango de fechas seleccionado"
                          : "Seleccione un rango de fechas para consultar sus documentos firmados"}
                      </span>
                    }
                  />
                )}
              >
                <List
                  style={{ width: "100%" }}
                  loading={isFetching || downloadDocMutation.isPending}
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
                      `Viendo ${range[0]}-${range[1]} de ${total} documentos`,
                    current: page,
                    pageSizeOptions: ["15", "30", "50", "100"],
                  }}
                  renderItem={(item: SignedDocumentResult) => (
                    <List.Item
                      actions={[
                        <Button
                          key={`download-${item.id}`}
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          // loading={downloadDocMutation.isPending}
                          onClick={() => downloadDocMutation.mutate(item)}
                        >
                          Descargar
                        </Button>,
                      ]}
                    >
                      <Skeleton
                        title={true}
                        loading={status === "pending"}
                        active
                      >
                        <List.Item.Meta
                          title={
                            <Flex gap="small" align="center">
                              <Text strong>{item.numero}</Text>
                              <Tag color="blue">{item.tipo_documento}</Tag>
                            </Flex>
                          }
                          description={
                            <Space direction="vertical" size="small">
                              <Text
                                ellipsis={{ tooltip: item.motivo }}
                                style={{ maxWidth: "400px" }}
                              >
                                {item.motivo}
                              </Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: "12px" }}
                              >
                                Firmado el:{" "}
                                {format(parseISO(item.fechacreacion), "PPP", {
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
        </Card>
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
    props: {},
  };
}
