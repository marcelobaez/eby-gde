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
  Flex,
  Space,
  Button,
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
import { useDownloadDocMutation } from "@/components/utils";
import { DownloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function Movimiento() {
  const router = useRouter();

  const [activeKey, setActiveKey] = useState("item-1");

  const expId = (router.query.id as string) || "";

  const {
    data: movsData,
    isError: isMovError,
    status: movsStatus,
  } = useExpMovsById(expId);

  const {
    data: docsData,
    isError: isDocsError,
    status: docsStatus,
  } = useGetDocsByExpId(expId);

  const docDownloadMutation = useDownloadDocMutation();

  if (movsStatus === "pending" || docsStatus === "pending") {
    return (
      <MainLayout>
        <Skeleton active />
      </MainLayout>
    );
  }

  if (isMovError || isDocsError) {
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
      render: (text, record) => {
        if (record.DOWNLOADABLE) {
          return (
            <Button
              color="primary"
              variant="link"
              onClick={() => docDownloadMutation.mutate(record)}
            >
              {text}
              <DownloadOutlined style={{ marginLeft: 5 }} />
            </Button>
          );
        }
        return <Text>{text}</Text>;
      },
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
            <Space>
              {activeKey === "item-1" ? (
                <ExportButton
                  data={movsData || []}
                  filename={`Movimientos Expediente: ${
                    movsData?.[0]?.EXPEDIENTE || ""
                  }`}
                  columns={movsExportColumns}
                />
              ) : (
                <ExportButton
                  data={docsData || []}
                  filename={`Documentos Expediente: ${
                    movsData?.[0]?.EXPEDIENTE || ""
                  }`}
                  columns={docsExportColumns}
                />
              )}
            </Space>
          </Flex>
        </Col>
        <Col span={24}>
          <Card variant="borderless" style={{ minHeight: "300px" }}>
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
                        loading={docDownloadMutation.isPending}
                      />
                    ),
                  },
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
