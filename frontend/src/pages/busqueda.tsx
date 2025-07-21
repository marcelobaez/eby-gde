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
import { GdeSearchResponse, GdeSearchResult } from "./api/gdesearch";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { useRouter } from "next/router";
import { ArrowRightOutlined } from "@ant-design/icons";
import { parseAsInteger, useQueryState } from "nuqs";
import { TRAMITES } from "@/utils/constants";
import { User } from "@/types/user";

const { Text, Paragraph } = Typography;

type SearchProps = GetProps<typeof Input.Search>;

const { Search } = Input;

function normalizeText(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remover acentos
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

function getLabelFromValue(value: number | string) {
  if (typeof value === "number") {
    return TRAMITES.find((tramite) => tramite.value === value)?.label;
  } else {
    return value;
  }
}

export default function SearchPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

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
  const [trata, setTrata] = useQueryState("trata", parseAsInteger);

  const [withFilters, setWithFilters] = React.useState(Boolean(year || trata));

  const [selectedItem, setSelectedItem] =
    React.useState<GdeSearchResult | null>(null);
  const [inputValue, setInputValue] = React.useState(searchTerm);

  // Fetch data
  const { data, status, isLoading, isFetching } = useQuery({
    queryKey: ["search-exp", searchTerm, page, pageSize, year, trata],
    queryFn: async () => {
      let filterQuery = "";
      if (withFilters) {
        if (year && trata) {
          filterQuery = `&year=${year}&trata=${trata}`;
        } else if (year) {
          filterQuery = `&year=${year}`;
        } else if (trata) {
          filterQuery = `&trata=${trata}`;
        }
      }
      const { data } = await axios.get<GdeSearchResponse>(
        `/api/gdesearch?searchQuery=${searchTerm}&page=${page}&pageSize=${pageSize}${filterQuery}`
      );
      return data;
    },
    enabled: searchTerm.length > 0,
  });

  const onSearch: SearchProps["onSearch"] = (value) => {
    setSearchTerm(value);
    setPage(1);
    if (value.length === 0) {
      setYear(null);
      setTrata(null);
      queryClient.removeQueries({ queryKey: ["search-exp"] });
    }
  };

  const showDrawer = () => {
    setOpenDrawer(true);
  };

  const onClose = () => {
    setOpenDrawer(false);
  };

  const HighlightedText = ({
    text,
    searchTerm,
    maxLength = 150,
  }: {
    text: string;
    searchTerm: string;
    maxLength?: number;
  }) => {
    if (!searchTerm) return <Text>{text}</Text>;

    // Normalize and split the search term into words
    const normalizedSearchTerms = normalizeText(searchTerm)
      .split(/\s+/) // Split on whitespace
      .filter((term) => term.length > 0) // Remove empty strings
      .map((term) => term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")); // Escape special characters

    if (normalizedSearchTerms.length === 0) return <Text>{text}</Text>;

    // Create a regex to match any of the terms
    const regex = new RegExp(`(${normalizedSearchTerms.join("|")})`, "gi");

    // Normalize the input text for comparison
    const normalizedText = normalizeText(text);

    // // Split the normalized text based on the regex matches
    // const parts = normalizedText.split(regex);
    // Find all matches and calculate their positions
    const matches = [...normalizedText.matchAll(regex)].map((match) => ({
      start: match.index || 0,
      end: (match.index || 0) + match[0].length,
    }));

    if (matches.length === 0) return <Text>{text}</Text>;

    // Determine the range of text to keep
    const firstMatchStart = matches[0].start;
    const lastMatchEnd = matches[matches.length - 1].end;

    const displayStart = Math.max(
      0,
      firstMatchStart - Math.floor(maxLength / 2)
    );
    const displayEnd = Math.min(
      text.length,
      lastMatchEnd + Math.floor(maxLength / 2)
    );
    const isTruncatedStart = displayStart > 0;
    const isTruncatedEnd = displayEnd < text.length;

    const visibleText = text.slice(displayStart, displayEnd);

    // Split the visible text based on the regex
    const parts = visibleText.split(regex);

    return (
      <Text>
        {isTruncatedStart && "..."}
        {parts.map((part, index) => {
          const isMatch = normalizedSearchTerms.some(
            (term) => normalizeText(part).toLowerCase() === term.toLowerCase()
          );
          return isMatch ? (
            <Text key={index} mark>
              {part}
            </Text>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          );
        })}
        {isTruncatedEnd && "..."}
      </Text>
    );
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
              Busqueda de expedientes
            </Typography.Title>
            <Typography.Text type="secondary">
              Consulte expedientes por palabras clave. Agregue filtros por año o
              tipo de tramitación
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
                  }}
                />
                <label htmlFor="tramite">Trámite:</label>
                <Select
                  id="tramite"
                  style={{ width: 200 }}
                  // onChange={handleChange}
                  showSearch
                  options={[
                    {
                      label: "Todos los trámites",
                      value: "",
                    },
                    ...TRAMITES,
                  ]}
                  labelInValue
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  value={
                    trata
                      ? { label: getLabelFromValue(trata), value: trata }
                      : ""
                  }
                  onChange={(value) => {
                    if (typeof value !== "string") {
                      setTrata(value.value);
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setYear(null);
                    setTrata(null);
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
                          key={`a-${item.id}`}
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
                              >{`EX-${item.anio}-${item.numero}--GDEEBY-${item.codigo_reparticion_usuario}`}</a>
                              <Badge status="default" text={item.estado} />
                            </Flex>
                          }
                          description={
                            <HighlightedText
                              text={item.descripcion}
                              searchTerm={searchTerm}
                              maxLength={100}
                            />
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
        title="Detalles del expediente"
        onClose={onClose}
        open={openDrawer}
        width={700}
      >
        {selectedItem && (
          <Flex vertical gap="middle">
            <Descriptions
              bordered
              size="small"
              items={[
                {
                  label: "Codigo",
                  children: (
                    <Flex gap="small" align="center">
                      <Paragraph
                        style={{ marginBottom: 0 }}
                        copyable
                      >{`EX-${selectedItem.anio}-${selectedItem.numero}--GDEEBY-${selectedItem.codigo_reparticion_usuario}`}</Paragraph>
                      <Button
                        color="primary"
                        variant="outlined"
                        size="small"
                        icon={<ArrowRightOutlined />}
                        iconPosition="end"
                        onClick={() =>
                          router.push(`/movimientos/${selectedItem.id}`)
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
                    <Badge status="default" text={selectedItem.estado} />
                  ),
                  span: 3,
                },
                {
                  label: "Tramite",
                  children: (
                    <Tag color="geekblue">
                      {getLabelFromValue(selectedItem.id_trata)}
                    </Tag>
                  ),
                  span: 3,
                },
                {
                  label: "Descripcion",
                  children: selectedItem.descripcion,
                  span: 3,
                },
                {
                  label: "Solicitado por",
                  children: selectedItem.usuario_creacion,
                  span: 3,
                },
                {
                  label: "Caratulado por",
                  children: selectedItem.usuario_creador,
                  span: 3,
                },
                // {
                //   label: "Ultimo usuario modificacion",
                //   children: selectedItem.usuario_modificacion,
                //   span: 3,
                // },
                {
                  label: "Caratulado en",
                  children: format(parseISO(selectedItem.fecha_creacion), "P", {
                    locale: esLocale,
                  }),
                  span: 3,
                },
                {
                  label: "Modificado en",
                  children: selectedItem.fecha_modificacion
                    ? format(parseISO(selectedItem.fecha_modificacion), "P", {
                        locale: esLocale,
                      })
                    : "N/A",
                  span: 3,
                },
              ]}
            />
            {/* <Divider /> */}
            <Descriptions
              title="Datos de solicitud"
              bordered
              items={[
                {
                  label: "Solicitado por",
                  children: selectedItem.usuario_creacion,
                  span: 3,
                },
                {
                  label: "Fecha solicitud",
                  children: format(
                    parseISO(selectedItem.fecha_creacion_sol),
                    "P",
                    {
                      locale: esLocale,
                    }
                  ),
                  span: 3,
                },
                {
                  label: "Motivo",
                  children: selectedItem.motivo,
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

  const { data } = await axios.get<User>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/me?populate=role`,
    {
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
    }
  );

  const canAccess =
    data.role.name.toLowerCase() === "administrator" ||
    data.role.name.toLowerCase() === "expsearch";

  if (data && !canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
