import React from "react";
import { MainLayout } from "../components/MainLayout";
import {
  Card,
  Col,
  Row,
  Typography,
  Space,
  Input,
  Flex,
  GetProps,
  List,
  Skeleton,
  Button,
  Badge,
  Drawer,
  Descriptions,
  ConfigProvider,
  Empty,
  Checkbox,
  CheckboxProps,
  Select,
  Tag,
} from "antd";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import axios from "axios";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GdeDocSearchResponse, GdeDocSearchResult } from "./api/gdesearchdocs";
import { useRouter } from "next/router";
import { DownloadOutlined } from "@ant-design/icons";
import { parseAsString, parseAsInteger, useQueryState } from "nuqs";
import { docTypes } from "@/utils/constants";
import { canSearchDocs } from "@/utils/featureGuards";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { logSearch, createSearchLogData } from "@/lib/searchLogger";
import { useSession } from "next-auth/react";
import { HighlightedText } from "@/components/highlight-text";

const { Text, Paragraph } = Typography;

type SearchProps = GetProps<typeof Input.Search>;

const { Search } = Input;

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
    number: parts[2],
    system: parts[3],
    location: parts[4],
  };
}

function generateYearsToNow() {
  const yearsOptions = [
    {
      label: "Todos los años",
      value: "",
    },
  ];

  for (let i = new Date().getFullYear(); i >= 2018; i--) {
    yearsOptions.push({
      label: i.toString(),
      value: i.toString(),
    });
  }

  return yearsOptions;
}

export default function SearchPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();

  const [openDrawer, setOpenDrawer] = React.useState(false);

  // URL state
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(7)
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [searchTerm, setSearchTerm] = useQueryState("searchTerm", {
    defaultValue: "",
  });
  const [year, setYear] = useQueryState("year", parseAsInteger);
  const [docType, setDocType] = useQueryState("type", parseAsString);

  const [withFilters, setWithFilters] = React.useState(
    Boolean(year || docType)
  );

  const [selectedItem, setSelectedItem] =
    React.useState<GdeDocSearchResult | null>(null);
  const [inputValue, setInputValue] = React.useState(searchTerm);

  // Download mutation
  const downloadDocMutation = useMutation({
    mutationFn: async (docResult: GdeDocSearchResult) => {
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
      message.error(
        "Ocurrió un error al intentar descargar el archivo. Por favor, intente nuevamente."
      );
    },
  });

  // Fetch data
  const { data, status, isLoading, isFetching } = useQuery({
    queryKey: ["search-exp", searchTerm, page, pageSize, year, docType],
    queryFn: async () => {
      let filterQuery = "";
      if (withFilters) {
        if (year && docType) {
          filterQuery = `&year=${year}&type=${docType}`;
        } else if (year) {
          filterQuery = `&year=${year}`;
        } else if (docType) {
          filterQuery = `&type=${docType}`;
        }
      }
      const { data } = await axios.get<GdeDocSearchResponse>(
        `/api/gdesearchdocs?searchQuery=${searchTerm}&page=${page}&pageSize=${pageSize}${filterQuery}`
      );

      // Log search after successful query (only for page 1 to avoid logging pagination)
      if (page === 1 && session) {
        const filters: Record<string, any> = {};
        if (year) filters.year = year;
        if (docType) filters.type = docType;
        if (withFilters) filters.withFilters = true;

        const logData = createSearchLogData(
          "Busqueda de Documentos",
          searchTerm,
          session,
          Object.keys(filters).length > 0 ? filters : undefined,
          data.pagination.totalCount
        );

        logSearch(logData).catch(console.error);
      }

      return data;
    },
    refetchOnWindowFocus: false,
    enabled: searchTerm.length > 0,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  const onSearch: SearchProps["onSearch"] = (value) => {
    setSearchTerm(value);
    setPage(1);
    if (value.length === 0) {
      setYear(null);
      setDocType(null);
      queryClient.removeQueries({ queryKey: ["search-exp"] });
    }
  };

  const showDrawer = () => {
    setOpenDrawer(true);
  };

  const onClose = () => {
    setOpenDrawer(false);
  };

  const onChange: CheckboxProps["onChange"] = (e) => {
    setWithFilters(e.target.checked);
  };

  return (
    <MainLayout>
      <Row gutter={16} justify="center" style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space direction="vertical">
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              Busqueda de Documentos en GDE
            </Typography.Title>
            <Typography.Text type="secondary">
              Consulte documentos por palabras clave. Puede agregar filtros por
              año o tipo de documento.
            </Typography.Text>
          </Space>
        </Col>
      </Row>
      <Row gutter={[16, 16]} justify="center">
        <Card style={{ minHeight: "calc(100dvh - 210px)", width: "100%" }}>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <Flex justify="center" align="center" gap="small">
              <Search
                placeholder="Ingrese palabras clave y presione enter"
                onSearch={onSearch}
                style={{ width: 400 }}
                enterButton
                allowClear
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                loading={isFetching}
              />
              <Checkbox onChange={onChange} checked={withFilters}>
                Busqueda con filtros
              </Checkbox>
            </Flex>
            {withFilters && (
              <Flex justify="center" align="center" gap="small">
                <label htmlFor="year">Año:</label>
                <Select
                  id="year"
                  style={{ width: 150 }}
                  options={[...generateYearsToNow()]}
                  value={year ? year.toString() : ""}
                  onChange={(value) => {
                    if (value === "") {
                      setYear(null);
                    } else {
                      setYear(parseInt(value));
                    }
                    setPage(1); // Reset page when year changes
                  }}
                />
                <label htmlFor="type">Tipo:</label>
                <Select
                  id="type"
                  style={{ width: 200 }}
                  placeholder="Seleccionar tipo de documento"
                  showSearch
                  allowClear
                  options={docTypes}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  value={docType || undefined}
                  onChange={(value) => {
                    setDocType(value || null);
                    setPage(1); // Reset page when type changes
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setYear(null);
                    setDocType(null);
                  }}
                >
                  Limpiar filtros
                </Button>
              </Flex>
            )}
            <Flex justify="start">
              <ConfigProvider
                renderEmpty={() => (
                  <Empty
                    description={
                      <span>
                        {searchTerm && data?.data.length === 0 ? (
                          <>
                            {`No se encontraron resultados para `}
                            <Text strong>{searchTerm}</Text>
                          </>
                        ) : (
                          "Ingrese palabras clave para buscar"
                        )}
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
                    // hideOnSinglePage: true,
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
                              <Tag color="blue">{item.tipo_documento}</Tag>
                            </Flex>
                          }
                          description={
                            <Space direction="vertical" size="small">
                              <HighlightedText
                                text={item.motivo}
                                searchTerm={searchTerm}
                                maxLength={150}
                              />
                              <Text
                                type="secondary"
                                style={{ fontSize: "12px" }}
                              >
                                Generado por: {item.datos_usuario}
                              </Text>
                              {item.total_expedientes > 0 && (
                                <Text
                                  type="secondary"
                                  style={{ fontSize: "12px" }}
                                >
                                  <Badge
                                    count={item.total_expedientes}
                                    size="small"
                                    style={{ backgroundColor: "#1890ff" }}
                                  />{" "}
                                  Expediente
                                  {item.total_expedientes > 1 ? "s" : ""}{" "}
                                  asociado
                                  {item.total_expedientes > 1 ? "s" : ""}
                                </Text>
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

  const canAccess = canSearchDocs(session.role);

  if (!canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
