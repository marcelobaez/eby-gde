import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";
import { useExpMovsById, useGetDocsByExpId } from "../../lib/fetchers";
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
  Tabs,
  Space,
  Flex,
} from "antd";
import { setStatus } from "../../utils/index";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { useState } from "react";
import { authOptions } from "../api/auth/[...nextauth]";
import { DocsResponse, GDEMovsResponse } from "@/types/apiGde";
import { ColumnsType } from "antd/es/table";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { ExportButton } from "../../components/ExportButton";

const { Text } = Typography;

export default function Movimiento() {
  const router = useRouter();

  const expId = (router.query.expId as string) || "";

  const [activeKey, setActiveKey] = useState("item-1");

  const { data: movsData, status: movsStatus } = useExpMovsById(expId);

  const { data: docsData, status: docsStatus } = useGetDocsByExpId(expId);

  if (movsStatus === "pending" || docsStatus === "pending") {
    return (
      <MainLayout>
        <Skeleton active />
      </MainLayout>
    );
  }

  if (movsStatus === "error" || docsStatus === "error") {
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

  const movsExportColumns = [
    {
      key: "ORD_HIST",
      label: "Orden",
    },
    {
      key: "FECHA_OPERACION",
      label: "Fecha",
      format: (value: string) =>
        format(parseISO(value), "P", { locale: esLocale }),
    },
    {
      key: "MOTIVO",
      label: "Motivo",
    },
    {
      key: "USUARIO",
      label: "Emisor",
    },
    {
      key: "DESTINATARIO",
      label: "Destino",
    },
    {
      key: "ESTADO",
      label: "Estado",
    },
  ];

  const docsExportColumns = [
    {
      key: "POSICION",
      label: "Orden",
      format: (value: string) => (parseInt(value) + 1).toString(),
    },
    {
      key: "NOMBRE_ARCHIVO",
      label: "Documento",
    },
    {
      key: "MOTIVO",
      label: "Motivo",
    },
    {
      key: "FECHA_ASOCIACION",
      label: "Fecha Asociacion",
      format: (value: string) =>
        format(parseISO(value), "P", { locale: esLocale }),
    },
    {
      key: "FECHA_CREACION",
      label: "Fecha Creacion",
      format: (value: string) =>
        format(parseISO(value), "P", { locale: esLocale }),
    },
  ];

  const columns: ColumnsType<GDEMovsResponse> = [
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

  const columnsDocs: ColumnsType<DocsResponse> = [
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
    "item-1": (
      <ExportButton
        data={movsData || []}
        filename={`Movimientos Expediente: ${movsData?.[0]?.EXPEDIENTE || ""}`}
        columns={movsExportColumns}
      />
    ),
    "item-2": (
      <ExportButton
        data={docsData || []}
        filename={`Documentos Expediente: ${movsData?.[0]?.EXPEDIENTE || ""}`}
        columns={docsExportColumns}
      />
    ),
    "item-3": null,
  };

  if (status === "error")
    return (
      <Alert
        message="Error"
        description="No fue posible realizar la operacion."
        type="error"
        showIcon
      />
    );

  return (
    <MainLayout>
      <Row gutter={[16, 16]} justify="center">
        <Col span={24}>
          <Flex justify="space-between">
            <Space direction="vertical">
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {`Expediente: ${movsData[0].EXPEDIENTE}`}
              </Typography.Title>
              <Typography.Text type="secondary">
                Aqui vera los detalles del expediente elegido, tales como sus
                movimientos, documentos asociados y jerarquias establecidas
              </Typography.Text>
            </Space>
            {extraItem[activeKey as keyof typeof extraItem]}
          </Flex>
        </Col>
        <Col span={24}>
          <Card variant="borderless" style={{ minHeight: "300px" }}>
            {movsData.length === 0 && (
              <Alert
                message="Aun no agregó expedientes"
                description="Diríjase a la pestaña Seguimiento y agregue uno para seguirlo"
                type="info"
                showIcon
              />
            )}
            {movsData.length > 0 && (
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
                        dataSource={movsData}
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
                  // ...(hasRelsPermissions
                  //   ? [
                  //       {
                  //         key: "item-3",
                  //         label: "Jerarquia",
                  //         children: (
                  //           <ArbolExp
                  //             exp={{
                  //               id: expId,
                  //               desc: movsData[0].DESCRIPCION,
                  //               codigo: movsData[0].EXPEDIENTE,
                  //               estado: movsData[0].ESTADO,
                  //               fechaCreacion: movsData[0].FECHA_CREACION,
                  //             }}
                  //           />
                  //         ),
                  //       },
                  //     ]
                  //   : []),
                ]}
              />
            )}
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

  return {
    props: {},
  };
}
