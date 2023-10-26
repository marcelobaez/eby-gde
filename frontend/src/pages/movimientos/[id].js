import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";
import { useQuery } from "react-query";
import { getMovsById, getDocsById } from "../../lib/fetchers";
import { MainLayout } from "../../components/MainLayout";
import {
  Row,
  Col,
  Card,
  Skeleton,
  Alert,
  Typography,
  Badge,
  Table,
  Button,
  Tabs,
} from "antd";
import { setStatus } from "../../utils/index";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { useState } from "react";
import ReactExport from "react-data-export";
import { FileExcelOutlined } from "@ant-design/icons";
import { authOptions } from "../api/auth/[...nextauth]";
import { ArbolExp } from "../../components/ArbolExp";
import { useHasRelPermission } from "../../hooks/useHasRelPermission";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const { Text } = Typography;

export default function Movimiento() {
  const router = useRouter();
  const [expId, setExpId] = useState(router.query.id);

  const hasRelsPermissions = useHasRelPermission();

  const [activeKey, setActiveKey] = useState("item-1");

  const { data, status } = useQuery(["movs", expId], () => getMovsById(expId));
  const { data: docsData } = useQuery(["docs", expId], () =>
    getDocsById(expId)
  );

  if (status === "loading") {
    return (
      <MainLayout>
        <Skeleton active />
      </MainLayout>
    );
  }

  if (status === "error") {
    return (
      <MainLayout>
        <Alert
          message="Error"
          description="No fue posible realizar la operacion."
          type="error"
          showIcon
        />
      </MainLayout>
    );
  }

  const MovExport = () => (
    <ExcelFile
      filename={`Movimientos Expediente: ${data[0].EXPEDIENTE}`}
      element={
        <Button disabled={data.length === 0} icon={<FileExcelOutlined />}>
          Exportar
        </Button>
      }
    >
      <ExcelSheet data={data} name="Movimientos">
        <ExcelColumn label="Orden" value="ORD_HIST" />
        <ExcelColumn
          label="Fecha"
          value={(col) =>
            format(parseISO(col.FECHA_OPERACION), "P", {
              locale: esLocale,
            })
          }
        />
        <ExcelColumn label="Motivo" value="MOTIVO" />
        <ExcelColumn label="Emisor" value="USUARIO" />
        <ExcelColumn label="Destino" value="DESTINATARIO" />
        <ExcelColumn label="Estado" value="ESTADO" />
      </ExcelSheet>
    </ExcelFile>
  );

  const DocsExport = () => (
    <ExcelFile
      filename={`Documentos Expediente: ${data[0].EXPEDIENTE}`}
      element={
        <Button disabled={docsData.length === 0} icon={<FileExcelOutlined />}>
          Exportar
        </Button>
      }
    >
      <ExcelSheet data={docsData} name="Documentos">
        <ExcelColumn
          label="Orden"
          value={(col) => parseInt(col.POSICION) + 1}
        />
        <ExcelColumn label="Documento" value="NOMBRE_ARCHIVO" />
        <ExcelColumn label="Motivo" value="MOTIVO" />
        <ExcelColumn
          label="Fecha Asociacion"
          value={(col) =>
            format(parseISO(col.FECHA_ASOCIACION), "P", {
              locale: esLocale,
            })
          }
        />
        <ExcelColumn
          label="Fecha Creacion"
          value={(col) =>
            format(parseISO(col.FECHA_CREACION), "P", {
              locale: esLocale,
            })
          }
        />
      </ExcelSheet>
    </ExcelFile>
  );

  const columns = [
    {
      title: "Orden",
      dataIndex: "ORD_HIST",
      key: "ORD_HIST",
    },
    {
      title: "Fecha",
      dataIndex: "FECHA_OPERACION",
      key: "FECHA_OPERACION",
      render: (text) => (
        <Text>
          {format(parseISO(text), "P", {
            locale: esLocale,
          })}
        </Text>
      ),
    },
    {
      title: "Motivo",
      dataIndex: "MOTIVO",
      key: "MOTIVO",
      width: 320,
      ellipsis: true,
    },
    { title: "Emisor", dataIndex: "USUARIO", key: "USUARIO", width: 180 },
    {
      title: "Destino",
      dataIndex: "DESTINATARIO",
      key: "DESTINATARIO",
      width: 180,
    },
    {
      title: "Estado",
      key: "ESTADO",
      dataIndex: "ESTADO",
      render: (text) => (
        <span>
          <Badge status={setStatus(text)} />
          {text}
        </span>
      ),
    },
  ];

  const columnsDocs = [
    {
      title: "Orden",
      dataIndex: "POSICION",
      key: "POSICION",
      render: (text) => <Text>{parseInt(text) + 1}</Text>,
    },
    {
      title: "Documento",
      dataIndex: "NOMBRE_ARCHIVO",
      width: 320,
      key: "NOMBRE_ARCHIVO",
    },
    {
      title: "Motivo",
      dataIndex: "MOTIVO",
      key: "MOTIVO",
      width: 320,
      ellipsis: true,
    },
    {
      title: "Fecha Asociacion",
      dataIndex: "FECHA_ASOCIACION",
      key: "FECHA_ASOCIACION",
      render: (text) => (
        <Text>
          {format(parseISO(text), "P", {
            locale: esLocale,
          })}
        </Text>
      ),
    },
    {
      title: "Fecha Creacion",
      dataIndex: "FECHA_CREACION",
      key: "FECHA_CREACION",
      render: (text) => (
        <Text>
          {format(parseISO(text), "P", {
            locale: esLocale,
          })}
        </Text>
      ),
    },
  ];

  const extraItem = {
    "item-1": <MovExport />,
    "item-2": <DocsExport />,
    "item-3": null,
  };

  return (
    <MainLayout>
      <Row gutter={[16, 16]} justify="center">
        <Col span={24}>
          <Card
            title={`Expediente: ${data[0].EXPEDIENTE}`}
            bordered={false}
            style={{ width: "100%", minHeight: "300px" }}
            extra={extraItem[activeKey]}
          >
            {data.length === 0 && (
              <Alert
                message="Aun no agregó expedientes"
                description="Diríjase a la pestaña Seguimiento y agregue uno para seguirlo"
                type="info"
                showIcon
              />
            )}
            {data.length > 0 && (
              <Tabs
                activeKey={activeKey}
                onChange={setActiveKey}
                items={[
                  {
                    key: "item-1",
                    label: "Movimientos",
                    children: (
                      <Table
                        columns={columns}
                        dataSource={data}
                        size="middle"
                        rowKey="ID_MOV"
                      />
                    ),
                  },
                  {
                    key: "item-2",
                    label: "Documentos",
                    children: (
                      <Table
                        columns={columnsDocs}
                        dataSource={docsData}
                        size="middle"
                        rowKey="ID"
                      />
                    ),
                  },
                  hasRelsPermissions
                    ? {
                        key: "item-3",
                        label: "Jerarquia",
                        children: (
                          <ArbolExp
                            exp={{
                              id: expId,
                              desc: data[0].DESCRIPCION,
                              codigo: data[0].EXPEDIENTE,
                              estado: data[0].ESTADO,
                            }}
                          />
                        ),
                      }
                    : null,
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
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
