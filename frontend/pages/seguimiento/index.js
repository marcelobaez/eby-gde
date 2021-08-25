import { Card, Col, Row, Skeleton, Alert, PageHeader, Space, Button, message, Typography, Popconfirm, Tooltip } from 'antd';
import { MainLayout } from "../../components/MainLayout";
import { ModalCreateList } from '../../components/ModalCreateList'
import { useQuery, QueryClient, useQueryClient, useMutation } from "react-query";
import { dehydrate } from "react-query/hydration";
import { getListas } from '../../lib/fetchers';
import { getSession } from "next-auth/client";
import { useRouter } from 'next/router';
import Link from 'next/link';
import { DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Paragraph } = Typography;

export default function Seguimiento() {
  const { data, status } = useQuery("listas", getListas);
  const queryClient = useQueryClient();
  const router = useRouter()

  const updateListMutation = useMutation(
    (body) => {
      const { id, titulo } = body;
      return axios.put(`/api/listas/${id}`, {
        titulo,
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries("listas");

        const previousValue = queryClient.getQueryData("listas");

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData("listas", previousValue);
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("listas");
      },
    }
  );

  const removeListMutation = useMutation(
    (id) => axios.delete(`/api/listas/${id}`),
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries("listas");

        const previousValue = queryClient.getQueryData("listas");

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData("listas", previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Lista eliminada");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("listas");
      },
    }
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

  const handleEdit = (id, value) => {
    updateListMutation.mutate({id, titulo: value})
  }

  const handleDelete = id => {
    removeListMutation.mutate(id)
  }

  return (
    <MainLayout>
      <Row gutter={16}>
        <Col key='list-header' span={24}>
          <PageHeader
            onBack={router.asPath === '/seguimiento' ? null : window.history.back()}
            title="Listas de seguimiento"
            extra={[<ModalCreateList key='create-list'/>]}
          />
        </Col>
        {
          data.map(list => (
            <Col key={list.id} span={8}>
              <Card 
                title={<Paragraph editable={{ onChange: (value) => handleEdit(list.id, value) }}>{list.titulo}</Paragraph>} 
                bordered={false} 
                hoverable
                extra={
                  <Space>
                    {
                      data.length === 1 ? (
                        <Tooltip title="No puede eliminar la unica lista">
                          <Button disabled type="link" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      ) : (
                        <Popconfirm okType='danger' onConfirm={() => handleDelete(list.id)} title="Está seguro？Esta acción no es reversible" okText="Eliminar" cancelText="No">
                          <Button type="link" danger icon={<DeleteOutlined />}></Button>
                        </Popconfirm>
                      )
                    }
                    <Link href={`/seguimiento/${list.id}`}><a>Ver</a></Link>
                  </Space>
                }>
                {`${list.expedientes.length > 0 ? `Siguiendo ${list.expedientes.length} expediente(s)`: 'Sin expedientes'}`}
              </Card>
            </Col>
          ))
        }
      </Row>
    </MainLayout>
  )
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

  await queryClient.prefetchQuery("listas", getListas);

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}
