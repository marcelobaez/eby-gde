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
  Tabs,
  DatePicker,
  Modal,
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
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { TRAMITES } from "@/utils/constants";
import { canSearchExp } from "@/utils/featureGuards";
import { AssociateByDoc } from "@/components/AssociateByDoc";
import { createSearchLogData, logSearch } from "@/lib/searchLogger";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import { formatDateForAPI } from "@/utils";
import { RangePickerProps } from "antd/es/date-picker";
import { HighlightedText } from "@/components/highlight-text";

const { Text, Paragraph, Title } = Typography;

const { RangePicker } = DatePicker;

type SearchProps = GetProps<typeof Input.Search>;

const { Search } = Input;

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

const tabs = [
  {
    key: "gde",
    label: "Buscar en GDE",
    children: <SearchGDEExps />,
  },
  {
    key: "fisico",
    label: "Buscar Expedientes Físicos",
    children: <AssociateByDoc mode="search" />,
  },
];

function SearchGDEExps() {
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
  const [trata, setTrata] = useQueryState("trata", parseAsInteger);

  const [startDate, setStartDate] = useQueryState("startDate", parseAsString);
  const [endDate, setEndDate] = useQueryState("endDate", parseAsString);

  const [withFilters, setWithFilters] = React.useState(
    Boolean(year || trata || (startDate && endDate))
  );

  const [selectedItem, setSelectedItem] =
    React.useState<GdeSearchResult | null>(null);
  const [inputValue, setInputValue] = React.useState(searchTerm);

  const [isRangeNeeded, setIsRangeNeeded] = React.useState(false);

  // Fetch data
  const { data, status, isFetching } = useQuery({
    queryKey: [
      "search-exp",
      searchTerm,
      page,
      pageSize,
      year,
      trata,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      let filterQuery = "";
      if (withFilters) {
        const filterParams = [];
        if (year) {
          filterParams.push(`year=${year}`);
        }
        if (trata) {
          filterParams.push(`trata=${trata}`);
        }
        if (startDate && endDate) {
          filterParams.push(`startDate=${startDate}&endDate=${endDate}`);
        }
        filterQuery =
          filterParams.length > 0 ? `&${filterParams.join("&")}` : "";
      }
      const { data } = await axios.get<GdeSearchResponse>(
        `/api/gdesearch?searchQuery=${searchTerm}&page=${page}&pageSize=${pageSize}${filterQuery}`
      );

      // Log search after successful query (only for page 1 to avoid logging pagination)
      if (searchTerm && page === 1 && session) {
        const filters: Record<string, any> = {};
        if (year) filters.year = year;
        if (trata) filters.type = trata;
        if (withFilters) filters.withFilters = true;

        const logData = createSearchLogData(
          "Busqueda de Expedientes GDE",
          searchTerm,
          session,
          Object.keys(filters).length > 0 ? filters : undefined,
          data.pagination.totalCount
        );

        logSearch(logData).catch(console.error);
      }

      return data;
    },
    enabled: Boolean(searchTerm.length > 0 || (startDate && endDate)),
  });

  const onSearch: SearchProps["onSearch"] = (value, event, info) => {
    setSearchTerm(value);
    setPage(1);
    if (
      value.length === 0 &&
      (!startDate || !endDate) &&
      info?.source !== "clear"
    ) {
      setIsRangeNeeded(true);
      // setYear(null);
      // setTrata(null);
      // queryClient.removeQueries({ queryKey: ["search-exp"] });
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

  return (
    <>
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
                <Flex justify="center" align="center" gap="middle">
                  <Space>
                    <Text>Fecha creación:</Text>
                    <RangePicker
                      {...(startDate && endDate
                        ? { value: [dayjs(startDate), dayjs(endDate)] }
                        : {})}
                      onChange={handleDateRangeChange}
                      format="DD/MM/YYYY"
                      placeholder={["Fecha desde", "Fecha hasta"]}
                    />
                  </Space>
                </Flex>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setYear(null);
                    setTrata(null);
                    setStartDate(null);
                    setEndDate(null);
                    setPage(1);
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
                  children: format(
                    parseISO(selectedItem.fecha_creacion.split("T")[0]),
                    "P",
                    {
                      locale: esLocale,
                    }
                  ),
                  span: 3,
                },
                {
                  label: "Modificado en",
                  children: selectedItem.fecha_modificacion
                    ? format(
                        parseISO(selectedItem.fecha_modificacion.split("T")[0]),
                        "P",
                        {
                          locale: esLocale,
                        }
                      )
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
      <Modal
        title="Rango requerido"
        open={isRangeNeeded}
        onOk={() => setIsRangeNeeded(false)}
        onCancel={() => setIsRangeNeeded(false)}
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <p>
          La busqueda sin palabras clave requiere de al menos un rango de fechas
        </p>
        <p>
          Por favor, active &quot;Busqueda con filtros&quot; y luego seleccione
          un rango de fechas.
        </p>
      </Modal>
    </>
  );
}

export default function SearchPage() {
  return (
    <MainLayout>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space direction="vertical">
            <Title level={4} style={{ marginBottom: 0 }}>
              Consulta de expedientes
            </Title>
            <Typography.Text type="secondary">
              Aqui puede buscar expedientes en GDE y Fisicos. Las busquedas se
              realizan sobre la caratula del expediente.
            </Typography.Text>
          </Space>
        </Col>
        <Col span={24}>
          <Card>
            <Tabs defaultActiveKey="gde" items={tabs} />
          </Card>
        </Col>
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

  const canAccess = canSearchExp(session.role);

  if (!canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
