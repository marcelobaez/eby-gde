import { useRouter } from "next/router";
import { getSession } from "next-auth/client";
import { QueryClient, useQuery } from "react-query";
import { dehydrate } from "react-query/hydration";
import { getMovsById } from "../../lib/fetchers";
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
  Tooltip,
} from "antd";
import { setStatus } from "../../utils/index";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { useState } from "react";
import ReactExport from "react-export-excel";
import { FileExcelOutlined } from "@ant-design/icons";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const { Text } = Typography;

export default function Movimiento() {
  const router = useRouter();
  const [expId, setExpId] = useState(router.query.id);

  const { data, status } = useQuery(["movs", expId], () => getMovsById(expId));

  console.log(data);

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

  return (
    <MainLayout>
      <Row gutter={[16, 16]} justify="center">
        <Col span={24}>
          <Card
            title={`Movimientos expediente: ${data[0].EXPEDIENTE}`}
            bordered={false}
            style={{ width: "100%", minHeight: "300px" }}
            extra={
              <ExcelFile
                filename={`Movimientos expediente: ${data[0].EXPEDIENTE}`}
                element={
                  <Button
                    disabled={data.length === 0}
                    icon={<FileExcelOutlined />}
                  >
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
            }
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
              <Table
                columns={columns}
                dataSource={data}
                size="middle"
                rowKey="ID_MOV"
              />
            )}
          </Card>
        </Col>
      </Row>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  const { id } = context.query;

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery(["movs", id], () => getMovsById(id));

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}
