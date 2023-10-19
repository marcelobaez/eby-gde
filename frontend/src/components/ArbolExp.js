import { useState } from "react";
import {
  Result,
  Space,
  Tree,
  Typography,
  Skeleton,
  Avatar,
  List,
  Col,
  Card,
  Empty,
  Button,
  Modal,
  message,
  Popover,
  Tooltip,
} from "antd";
import { useGetArbolExpByGdeId } from "../hooks/useArbolExp";
import {
  FolderOutlined,
  ApartmentOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";
import { SearchExpForm } from "./SearchExpForm";
import axios from "axios";
import { useQueryClient, useMutation, QueryClientProvider } from "react-query";
import { api } from "../lib/axios";
import { createTreeNodes, findId } from "../utils";
import { RelationsModal } from "./RelationsModal";

const { Paragraph, Text } = Typography;
const { info } = Modal;

export function ArbolExp({ exp: { id, desc, codigo } }) {
  // console.log({ id, desc, codigo });
  const { data, isLoading, isError } = useGetArbolExpByGdeId(id);
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([id]);

  const onSelect = (selectedKeys, info) => {
    setSelectedKeys(selectedKeys);
  };

  const updateNotesMutation = useMutation(
    (body) => {
      const { id, notas } = body;
      return api.put(`/expedientes-relaciones/${id}`, {
        data: { notas },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp", id]);

        const previousValue = queryClient.getQueryData(["arbolExp", id]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", id], previousValue);
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", id]);
      },
    }
  );

  const addExpMutation = useMutation(
    (asFather) => {
      return api.post("/expedientes-relaciones", {
        data: asFather
          ? {
              parent: {
                expId: searchData[0].ID,
                expCode: searchData[0].CODIGO,
                descripcion: searchData[0].DESCRIPCION.substring(0, 255),
              },
              child: {
                expId: id,
                expCode: codigo,
                descripcion: desc,
              },
            }
          : {
              parent: {
                expId: id,
                expCode: codigo,
                descripcion: desc,
              },
              child: {
                expId: searchData[0].ID,
                expCode: searchData[0].CODIGO,
                descripcion: searchData[0].DESCRIPCION.substring(0, 255),
              },
            },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp", id]);

        const previousValue = queryClient.getQueryData(["arbolExp", id]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", id], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
        handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", id]);
        Modal.destroyAll();
      },
    }
  );

  const updateExpRelMutation = useMutation(
    () => {
      return api.put(
        `/expedientes-relaciones/updaterel/${findId(selectedKeys[0], data[0])}`,
        {
          data: {
            child: {
              expId: searchData[0].ID,
              expCode: searchData[0].CODIGO,
              descripcion: searchData[0].DESCRIPCION.substring(0, 255),
            },
          },
        }
      );
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp", id]);

        const previousValue = queryClient.getQueryData(["arbolExp", id]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", id], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
        handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", id]);
        Modal.destroyAll();
      },
    }
  );

  const handleSubmit = async (values) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    queryClient.invalidateQueries("expedientes");

    setIsSearching(false);

    const hasResults = expedientes.length > 0;

    setSearchData(expedientes);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
  };

  const handleEditNotes = (id, value) => {
    updateNotesMutation.mutate({ id, notas: value });
  };

  const showConfirm = () => {
    info({
      title: "Indique el tipo de asociación que desea realizar",
      content: (
        <Space>
          {data.length === 0 && (
            <Button
              icon={<ArrowUpOutlined />}
              onClick={() => addExpMutation.mutate(true)}
            >
              Asociar como Padre
            </Button>
          )}
          <Button
            icon={<ArrowDownOutlined />}
            onClick={() => {
              if (data.length === 0) {
                addExpMutation.mutate(false);
              } else {
                updateExpRelMutation.mutate();
              }
            }}
          >
            Asociar como Hijo
          </Button>
        </Space>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 500,
    });
  };

  const showRelations = (id) => {
    info({
      title: "Editar las relaciones del expediente",
      content: (
        <QueryClientProvider client={queryClient}>
          <RelationsModal id={id} />
        </QueryClientProvider>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 500,
      icon: null,
    });
  };

  if (isError)
    return (
      <Result
        status="500"
        title="500"
        subTitle="Disculpe, hubo un error al cargar el expediente."
      />
    );

  if (isLoading) return <Skeleton active />;

  // console.log({ data });

  // console.log(data[0]);

  const treeData = data && data.length > 0 ? createTreeNodes(data[0]) : {};

  // console.log({ treeData });

  return (
    <Space direction="vertical" size="middle" style={{ display: "flex" }}>
      {data.length > 0 ? (
        <>
          <Text strong>
            Esta es la estructura a la que pertenece el expediente:
          </Text>
          <Tree
            showLine
            showIcon
            defaultExpandAll
            selectedKeys={selectedKeys}
            onSelect={onSelect}
            treeData={[treeData]}
            titleRender={(nodeData) => {
              return (
                <Space>
                  <span>{nodeData.title}</span>
                  <Popover
                    title="Descripcion"
                    content={
                      <Space direction="vertical">
                        <Paragraph
                          style={{ width: 300, wordBreak: "break-word" }}
                        >
                          {nodeData.desc}
                        </Paragraph>
                        <Text strong>Notas</Text>
                        <Paragraph
                          editable={{
                            onChange: (value) =>
                              handleEditNotes(nodeData.expId, value),
                          }}
                          style={{ width: 200, wordBreak: "break-word" }}
                        >
                          {nodeData.notes}
                        </Paragraph>
                      </Space>
                    }
                    trigger="click"
                  >
                    <Tooltip title="Ver informacion">
                      <Button type="text" icon={<InfoCircleOutlined />} />
                    </Tooltip>
                  </Popover>
                  <Tooltip title="Agregar hijo">
                    <Button
                      type="text"
                      icon={<FolderAddOutlined />}
                      onClick={() => showRelations(nodeData.key)}
                    />
                  </Tooltip>
                  {/* </Popconfirm> */}
                  {/* <Button
                  type="link"
                  icon={<ExportOutlined />}
                  onClick={() => router.push(`/movimientos/${nodeData.key}`)}
                /> */}
                </Space>
              );
            }}
          />
        </>
      ) : (
        <Empty description="No hay asociaciones">
          <Text strong>
            Puede utilizar el formulario debajo para buscar un expediente y
            asociarlo
          </Text>
        </Empty>
      )}

      {showEmpty && (
        <Col span={24}>
          <Card bordered={false} style={{ width: "100%" }}>
            <Empty description="No se encontraron resultados. Verifique los valores ingresados" />
          </Card>
        </Col>
      )}
      <SearchExpForm
        handleSubmit={handleSubmit}
        handleReset={handleReset}
        isSearching={isSearching}
      />
      {searchData.length > 0 && (
        <Col span={24}>
          <List
            itemLayout="horizontal"
            size="large"
            dataSource={[
              {
                code: searchData[0].CODIGO,
                description: searchData[0].DESCRIPCION,
              },
            ]}
            loading={isSearching}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Button icon={<ApartmentOutlined />} onClick={showConfirm}>
                    Asociar
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<FolderOutlined />} />}
                  title={item.code}
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </Col>
      )}
    </Space>
  );
}
