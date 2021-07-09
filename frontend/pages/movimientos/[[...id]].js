import { useRouter } from "next/router";
import { getSession } from "next-auth/client";
import { QueryClient, useQuery } from "react-query";
import { dehydrate } from "react-query/hydration";
import { getMovs } from "../../lib/fetchers";
import { MainLayout } from "../../components/MainLayout";
import {
  Row,
  Col,
  Card,
  Skeleton,
  Alert,
  Select,
  Space,
  Typography,
  Badge,
  Table,
} from "antd";
import { setStatus } from "../../utils/index";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { useState } from "react";

const { Option } = Select;
const { Text } = Typography;

export default function Movimiento() {
  const router = useRouter();
  const [filtered, setFiltered] = useState([]);
  const [expId, setExpId] = useState(null);

  const { data, status } = useQuery("movs", () => getMovs(), {
    onSuccess: (data) => {
      const { id } = router.query;
      if (id) {
        const idExp = parseInt(id[0], 10);
        setExpId(expId);
        const filteredData = data.filter((item) => item.ID === idExp);
        setFiltered(filteredData);
      } else {
        const filteredData = data.filter((item) => item.ID === data[0].ID);
        setFiltered(filteredData);
      }
    },
  });

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

  const handleChange = (value) => {
    setExpId(value);
    const filteredData = data.filter((item) => item.ID === value);
    setFiltered(filteredData);
  };

  const distinct = [];
  const map = new Map();
  for (const item of data) {
    if (!map.has(item.ID)) {
      map.set(item.ID, true);
      distinct.push({
        id: item.ID,
        exp: item.EXPEDIENTE,
      });
    }
  }

  let defaultValue;

  if (filtered.length > 0) {
    if (expId) {
      const matchingEl = distinct.find((item) => item.id === expId);
      defaultValue = matchingEl.exp;
    } else {
      defaultValue = distinct[0].exp;
    }
  }

  const SelectMenu = () => {
    return filtered.length > 0 ? (
      <Space>
        Movimientos expediente:
        <Select
          defaultValue={defaultValue}
          style={{ width: 240 }}
          onChange={handleChange}
        >
          {distinct.map((exp) => (
            <Option key={exp.id} value={exp.id}>
              {exp.exp}
            </Option>
          ))}
        </Select>
      </Space>
    ) : null;
  };

  const columns = [
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
            title={<SelectMenu />}
            bordered={false}
            style={{ width: "100%", minHeight: "300px" }}
          >
            {filtered.length === 0 && (
              <Alert
                message="Aun no agregó expedientes"
                description="Diríjase a la pestaña Seguimiento y agregue uno para seguirlo"
                type="info"
                showIcon
              />
            )}
            {filtered.length > 0 && (
              <Table
                columns={columns}
                dataSource={filtered}
                pagination={false}
                size="middle"
                rowKey='ID_MOV'
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

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery("movs", () => getMovs());

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}
