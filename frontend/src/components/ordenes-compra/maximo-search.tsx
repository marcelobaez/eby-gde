import {
  Button,
  Flex,
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
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useDebouncedState } from "@react-hookz/web";
import {
  parseAsString,
  parseAsInteger,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type OrdenCompraDBResult = {
  oc: string;
  id_empresa: string;
  descripcion: string;
  dtipodoc: string;
  dmodalidadcompra: string;
  nnumeroconcurso: string;
  dsede: string;
  destado: string;
  fecha_estado: string;
  dnombre_empresa: string;
  dsdc: string;
  nexpediente: string;
  ffechaemision: string;
  ncosto: string;
  dmoneda: string;
  ncostobase: string;
  ffechaenvioprov: string;
  despecialidad: string;
};

interface OrdenCompraDBResponse {
  data: OrdenCompraDBResult[];
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

export function MaximoSearch() {
  const router = useRouter();
  const [pageSize, setPageSize] = useQueryState(
    "dbPageSize",
    parseAsInteger.withDefault(10),
  );
  const [page, setPage] = useQueryState(
    "dbPage",
    parseAsInteger.withDefault(1),
  );

  const [
    { oc, descripcion, nnumeroconcurso, dnombre_empresa, nexpediente },
    setParams,
  ] = useQueryStates({
    oc: parseAsString.withDefault(""),
    descripcion: parseAsString.withDefault(""),
    nnumeroconcurso: parseAsString.withDefault(""),
    dnombre_empresa: parseAsString.withDefault(""),
    nexpediente: parseAsString.withDefault(""),
  });

  const [ocInput, setOcInput] = useState<string>(oc);
  const [descripcionInput, setDescripcionInput] = useState<string>(descripcion);
  const [nnumeroconcursoInput, setNnumeroconcursoInput] =
    useState<string>(nnumeroconcurso);
  const [dnombre_empresaInput, setDnombre_empresaInput] =
    useState<string>(dnombre_empresa);
  const [nexpedienteInput, setNexpedienteInput] = useState<string>(nexpediente);

  const [debouncedOc, setDebouncedOc] = useDebouncedState(oc, 400);
  const [debouncedDescripcion, setDebouncedDescripcion] = useDebouncedState(
    descripcion,
    400,
  );
  const [debouncedNnumeroconcurso, setDebouncedNnumeroconcurso] =
    useDebouncedState(nnumeroconcurso, 400);
  const [debouncedDnombre_empresa, setDebouncedDnombre_empresa] =
    useDebouncedState(dnombre_empresa, 400);
  const [debouncedNexpediente, setDebouncedNexpediente] = useDebouncedState(
    nexpediente,
    400,
  );
  const ocSyncedRef = useRef(false);

  useEffect(() => {
    if (router.isReady && !ocSyncedRef.current) {
      const urlOc = router.query.oc as string;
      if (urlOc) {
        setParams({ oc: urlOc });
        setOcInput(urlOc);
        setDebouncedOc(urlOc);
        ocSyncedRef.current = true;
      }
    }
  }, [router.isReady, router.query.oc, setParams, setDebouncedOc]);

  useEffect(() => {
    setOcInput(oc);
  }, [oc]);

  useEffect(() => {
    setDescripcionInput(descripcion);
  }, [descripcion]);

  useEffect(() => {
    setNnumeroconcursoInput(nnumeroconcurso);
  }, [nnumeroconcurso]);

  useEffect(() => {
    setDnombre_empresaInput(dnombre_empresa);
  }, [dnombre_empresa]);

  useEffect(() => {
    setNexpedienteInput(nexpediente);
  }, [nexpediente]);

  useEffect(() => {
    if (debouncedOc !== oc) {
      setParams({ oc: debouncedOc });
      setPage(1);
    }
  }, [debouncedOc, oc, setParams, setPage]);

  useEffect(() => {
    if (debouncedDescripcion !== descripcion) {
      setParams({ descripcion: debouncedDescripcion });
      setPage(1);
    }
  }, [debouncedDescripcion, descripcion, setParams, setPage]);

  useEffect(() => {
    if (debouncedNnumeroconcurso !== nnumeroconcurso) {
      setParams({ nnumeroconcurso: debouncedNnumeroconcurso });
      setPage(1);
    }
  }, [debouncedNnumeroconcurso, nnumeroconcurso, setParams, setPage]);

  useEffect(() => {
    if (debouncedDnombre_empresa !== dnombre_empresa) {
      setParams({ dnombre_empresa: debouncedDnombre_empresa });
      setPage(1);
    }
  }, [debouncedDnombre_empresa, dnombre_empresa, setParams, setPage]);

  useEffect(() => {
    if (debouncedNexpediente !== nexpediente) {
      setParams({ nexpediente: debouncedNexpediente });
      setPage(1);
    }
  }, [debouncedNexpediente, nexpediente, setParams, setPage]);

  const hasFilters =
    debouncedOc ||
    debouncedDescripcion ||
    debouncedNnumeroconcurso ||
    debouncedDnombre_empresa ||
    debouncedNexpediente;

  const {
    data: dataOrdenCompraMaximo,
    status: statusOrdenCompraMaximo,
    isFetching: isFetchingOrdenCompraMaximo,
  } = useQuery({
    queryKey: [
      "ordenes-compra-maximo",
      page,
      pageSize,
      debouncedOc,
      debouncedDescripcion,
      debouncedNnumeroconcurso,
      debouncedDnombre_empresa,
      debouncedNexpediente,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (debouncedOc) params.append("oc", debouncedOc);
      if (debouncedDescripcion)
        params.append("descripcion", debouncedDescripcion);
      if (debouncedNnumeroconcurso)
        params.append("nnumeroconcurso", debouncedNnumeroconcurso);
      if (debouncedDnombre_empresa)
        params.append("dnombre_empresa", debouncedDnombre_empresa);
      if (debouncedNexpediente)
        params.append("nexpediente", debouncedNexpediente);

      const { data } = await axios.get<OrdenCompraDBResponse>(
        `/api/ordenes-compra/db?${params.toString()}`,
      );
      return data;
    },
    enabled: Boolean(hasFilters),
    staleTime: 1000 * 60 * 5,
  });

  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrdenCompraDBResult | null>(
    null,
  );

  const showDrawer = () => {
    setOpenDrawer(true);
  };

  const onClose = () => {
    setOpenDrawer(false);
  };

  const handleReset = () => {
    setParams({
      oc: null,
      descripcion: null,
      nnumeroconcurso: null,
      dnombre_empresa: null,
      nexpediente: null,
    });
    setOcInput("");
    setDescripcionInput("");
    setNnumeroconcursoInput("");
    setDnombre_empresaInput("");
    setNexpedienteInput("");
    setDebouncedOc("");
    setDebouncedDescripcion("");
    setDebouncedNnumeroconcurso("");
    setDebouncedDnombre_empresa("");
    setDebouncedNexpediente("");
    setPage(1);
  };

  const getEstadoColor = (estado: string) => {
    const estadoLower = (estado || "").toLowerCase();
    if (estadoLower.includes("aprobado") || estadoLower.includes("confirmado"))
      return "green";
    if (estadoLower.includes("pendiente") || estadoLower.includes("espera"))
      return "orange";
    if (estadoLower.includes("rechazado") || estadoLower.includes("cancelado"))
      return "red";
    if (estadoLower.includes("enviado")) return "blue";
    return "default";
  };

  return (
    <Flex justify="center" align="center" gap="middle" vertical>
      <Space wrap>
        <Flex vertical gap="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Número OC
          </Text>
          <Input
            placeholder="Número OC"
            value={ocInput}
            onChange={(e) => {
              setOcInput(e.target.value);
              setDebouncedOc(e.target.value);
            }}
            style={{ width: 150 }}
            allowClear
          />
        </Flex>
        <Flex vertical gap="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Descripción
          </Text>
          <Input
            placeholder="Descripción"
            value={descripcionInput}
            onChange={(e) => {
              setDescripcionInput(e.target.value);
              setDebouncedDescripcion(e.target.value);
            }}
            style={{ width: 180 }}
            allowClear
          />
        </Flex>
        <Flex vertical gap="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Nro concurso
          </Text>
          <Input
            placeholder="Nro concurso"
            value={nnumeroconcursoInput}
            onChange={(e) => {
              setNnumeroconcursoInput(e.target.value);
              setDebouncedNnumeroconcurso(e.target.value);
            }}
            style={{ width: 120 }}
            allowClear
          />
        </Flex>
        <Flex vertical gap="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Nombre empresa
          </Text>
          <Input
            placeholder="Nombre empresa"
            value={dnombre_empresaInput}
            onChange={(e) => {
              setDnombre_empresaInput(e.target.value);
              setDebouncedDnombre_empresa(e.target.value);
            }}
            style={{ width: 230 }}
            allowClear
          />
        </Flex>
        <Flex vertical gap="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Nro Expediente GDE
          </Text>
          <Input
            placeholder="Nro Expediente GDE"
            value={nexpedienteInput}
            onChange={(e) => {
              setNexpedienteInput(e.target.value);
              setDebouncedNexpediente(e.target.value);
            }}
            style={{ width: 230 }}
            allowClear
          />
        </Flex>
        <Flex vertical gap="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            &nbsp;
          </Text>
          <Button variant="outlined" onClick={handleReset}>
            Limpiar
          </Button>
        </Flex>
      </Space>
      <Flex vertical gap="middle" style={{ width: "100%", marginTop: 16 }}>
        <ConfigProvider
          renderEmpty={() => (
            <Empty
              description={
                <span>
                  {!hasFilters
                    ? "Ingrese al menos un criterio de búsqueda"
                    : `No se encontraron órdenes de compra`}
                </span>
              }
            />
          )}
        >
          <List
            style={{ width: "100%" }}
            loading={isFetchingOrdenCompraMaximo}
            itemLayout="horizontal"
            dataSource={dataOrdenCompraMaximo?.data || []}
            pagination={{
              onChange: (page) => {
                setPage(page);
              },
              onShowSizeChange: (curr, size) => setPageSize(size),
              pageSize: pageSize,
              total: dataOrdenCompraMaximo?.pagination.totalCount,
              position: "bottom",
              showTotal: (total: number, range: number[]) =>
                `Viendo ${range[0]}-${range[1]} de ${total} resultados`,
              current: page,
              pageSizeOptions: ["10", "20", "50"],
            }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <a
                    onClick={() => {
                      setSelectedItem(item);
                      showDrawer();
                    }}
                    key={`a-${item.oc}`}
                  >
                    Ver detalles
                  </a>,
                ]}
              >
                <Skeleton
                  title={true}
                  loading={statusOrdenCompraMaximo === "pending"}
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
                          {item.oc}
                        </a>
                        <Tag color={getEstadoColor(item.destado)}>
                          {item.destado}
                        </Tag>
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
                          Empresa: {item.dnombre_empresa || "N/A"} | Expediente:{" "}
                          {item.nexpediente || "N/A"}
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
      >
        {selectedItem && (
          <Flex vertical gap="middle">
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  label: "Número OC",
                  children: (
                    <Paragraph style={{ marginBottom: 0 }} copyable>
                      {selectedItem.oc}
                    </Paragraph>
                  ),
                },
                {
                  label: "Descripción",
                  children: selectedItem.descripcion,
                },
                {
                  label: "Empresa",
                  children: selectedItem.dnombre_empresa,
                },
                {
                  label: "Estado",
                  children: (
                    <Tag color={getEstadoColor(selectedItem.destado)}>
                      {selectedItem.destado}
                    </Tag>
                  ),
                },
                {
                  label: "Fecha Estado",
                  children: selectedItem.fecha_estado,
                },
                {
                  label: "Nro Concurso",
                  children: selectedItem.nnumeroconcurso,
                },
                {
                  label: "Expediente GDE",
                  children: (
                    <Typography.Text
                      copyable={{ text: selectedItem.nexpediente.trim() }}
                      style={{ marginBottom: 0 }}
                    >
                      {selectedItem.nexpediente}
                    </Typography.Text>
                  ),
                },
                {
                  label: "Tipo Documento",
                  children: selectedItem.dtipodoc,
                },
                {
                  label: "Modalidad Compra",
                  children: selectedItem.dmodalidadcompra,
                },
                {
                  label: "Sede",
                  children: selectedItem.dsede,
                },
                {
                  label: "Fecha Emisión",
                  children: selectedItem.ffechaemision,
                },
                {
                  label: "Costo",
                  children: selectedItem.ncosto
                    ? `${selectedItem.ncosto} ${selectedItem.dmoneda || ""}`
                    : "N/A",
                },
                {
                  label: "Costo Base",
                  children: selectedItem.ncostobase,
                },
                {
                  label: "Fecha Envío Proveedor",
                  children: selectedItem.ffechaenvioprov,
                },
                {
                  label: "Especialidad",
                  children: selectedItem.despecialidad,
                },
              ]}
            />
          </Flex>
        )}
      </Drawer>
    </Flex>
  );
}
