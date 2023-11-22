import React, { useEffect, useState } from "react";
import { MainLayout } from "../components/MainLayout";
import {
  Card,
  Col,
  Row,
  Empty,
  Typography,
  Space,
  Tree,
  Tooltip,
  Button,
  Drawer,
  Modal,
  Tag,
  Spin,
  message,
  List,
  Avatar,
} from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  ExclamationCircleFilled,
  FolderAddOutlined,
  FolderOutlined,
  InfoCircleOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { useQueryClient, QueryClientProvider, useMutation } from "react-query";
import { SearchExpForm } from "../components/SearchExpForm";
import axios from "axios";
import { useGetArbolExpByGdeId } from "../hooks/useArbolExp";
import {
  createTreeNodes,
  getKeys,
  reverseJsonTree,
  getTreeDepth,
} from "../utils/index";
import { ExpRelacionForm } from "../components/ExpRelacionForm";
import { ModalAssociateExp } from "../components/ModalAssociateExp";
import { ModalAssociateExistExp } from "../components/ModalAssociateExistExp";
import { api } from "../lib/axios";
import { useRouter } from "next/router";
import daysjs from "dayjs";
import { ModalAssociateExpAlt } from "../components/ModalAssociateExpAlt";

const { Paragraph, Text } = Typography;
const { info, confirm } = Modal;

export default function Documents() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedExpId, setSelectedExpId] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [selectedNodeData, setNodeData] = useState({});
  const [treeData, setTreeData] = useState({});
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [currDepth, setCurrDepth] = useState(0);
  const [searchParams, setSearchParams] = useState({
    year: router.query.year || new Date().getFullYear(),
    number: router.query.number,
  });

  // Obtener datos de la relacion
  const { data, isLoading, isSuccess } = useGetArbolExpByGdeId(selectedExpId, {
    enabled: Boolean(selectedExpId),
  });

  useEffect(() => {
    if (router.query.year && router.query.number) {
      const year = parseInt(router.query.year);
      const number = parseInt(router.query.number);
      setSearchParams({ year, number });
      handleSubmitMain({ year, number });
    }
  }, [router.query.year, router.query.number]);

  useEffect(() => {
    if (data && data.length > 0) {
      const reversedJson = reverseJsonTree(data[0]);
      const newTreeData = createTreeNodes(reversedJson, 4);
      setCurrDepth(getTreeDepth(newTreeData));
      setExpandedKeys(getKeys(newTreeData));
      setTreeData(newTreeData);
    } else {
      setTreeData({});
      setExpandedKeys([]);
    }
  }, [data]);

  const removeExpMutation = useMutation(
    (id) => {
      return api.put(`/expedientes-relaciones/deleterel/${id}`);
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp"]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          selectedNodeData.expId,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(
          ["arbolExp", selectedNodeData.expId],
          previousValue
        );
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion eliminada correctamente");
        // handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp"]);
      },
    }
  );

  // modal para crear una nueva relacion
  const showDrawerRelate = () => {
    info({
      title: "Crear asociacion",
      content: (
        <QueryClientProvider client={queryClient}>
          <ModalAssociateExp targetExp={searchData[0]} />
        </QueryClientProvider>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 800,
    });
  };

  // modal para crear una nueva relacion
  const showDrawerRelateAlt = (targetExp) => {
    info({
      title: "Buscar expediente a asociar",
      content: (
        <QueryClientProvider client={queryClient}>
          <ModalAssociateExpAlt
            targetExp={targetExp}
            existingIds={getKeys(treeData)}
            onlyChild={currDepth === 4}
          />
        </QueryClientProvider>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 800,
    });
  };

  // mostrar modal para asociar hijo a expediente existente
  const showDrawerRelateChild = (nodeData) => {
    info({
      title: "Buscar expediente a asociar",
      content: (
        <QueryClientProvider client={queryClient}>
          <ModalAssociateExistExp
            targetExp={nodeData}
            existingIds={getKeys(treeData)}
          />
        </QueryClientProvider>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 800,
    });
  };

  // handler para buscar expediente por año y numero
  const handleSubmitMain = async (values) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    queryClient.invalidateQueries("expedientes");

    setIsSearching(false);

    const hasResults = expedientes.length > 0;

    setSearchData(expedientes);
    if (hasResults) {
      setSelectedExpId(expedientes[0].ID);
      // Update the URL with the query parameters
      router.push({
        pathname: "/asociaciones",
        query: { year: values.year, number: values.number },
      });
    }
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
    setSelectedExpId(null);

    setSearchParams({
      year: new Date().getFullYear(),
      number: null,
    });
    // Update the URL with the query parameters
    router.push({
      pathname: "/asociaciones",
    });
  };

  const handleDelete = (id) => {
    confirm({
      title: "Esta seguro que desea eliminar esta relacion?",
      icon: <ExclamationCircleFilled />,
      content:
        "Esta accion no se puede deshacer. Todos los elementos asociados a este expediente seran eliminados.",
      onOk() {
        removeExpMutation.mutate(id);
      },
      onCancel() {
        console.log("Cancel");
      },
    });
  };

  const onExpand = (expandedKeysValue) => {
    // if not set autoExpandParent to false, if children expanded, parent can not collapse.
    // or, you can remove all expanded children keys.
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const hasNoParentAndChildren =
    data &&
    data.length > 0 &&
    data[0].attributes.children.data.length === 0 &&
    data[0].attributes.parent.data === null;

  return (
    <MainLayout>
      <Row gutter={[16, 16]} justify="center">
        <Col span={24}>
          <Card
            title={`Jerarquia de expedientes`}
            bordered={false}
            style={{ width: "100%", minHeight: "calc(100vh - 180px)" }}
          >
            <Space size="middle" direction="vertical" style={{ width: "100%" }}>
              <Paragraph>
                Utilice esta pagina para consultar las asociaciones de un
                expediente en el sistema GDEEBY. Si desea buscar otra
                asociacion, utilice el formulario debajo
              </Paragraph>
              <Row justify="center" gutter={16}>
                <Col span={24}>
                  <Card>
                    <SearchExpForm
                      handleSubmit={handleSubmitMain}
                      handleReset={handleReset}
                      isSearching={isSearching}
                      initialValues={{
                        year: searchParams.year,
                        number: searchParams.number,
                      }}
                    />
                  </Card>
                </Col>
              </Row>
              {isLoading && <Spin size="large" />}
              {data &&
                isSuccess &&
                Object.keys(treeData).length > 0 &&
                !showEmpty &&
                !hasNoParentAndChildren && (
                  <>
                    <Tree
                      selectable={false}
                      showLine
                      showIcon
                      treeData={[treeData]}
                      expandedKeys={expandedKeys}
                      autoExpandParent={autoExpandParent}
                      switcherIcon={<DownOutlined />}
                      onExpand={onExpand}
                      titleRender={(nodeData) => {
                        return (
                          <Space>
                            <Space>
                              {nodeData.key === String(selectedExpId) ? (
                                <Text
                                  style={{ width: 400 }}
                                  ellipsis={{
                                    tooltip: `${nodeData.title}${
                                      nodeData.desc ? " - " : ""
                                    }${nodeData.desc ?? ""}`,
                                  }}
                                  strong
                                  mark
                                >
                                  {`${nodeData.title}${
                                    nodeData.desc ? " - " : ""
                                  }${nodeData.desc ?? ""}`}
                                </Text>
                              ) : (
                                <Text
                                  style={{ width: 400 }}
                                  ellipsis={{
                                    tooltip: `${nodeData.title}${
                                      nodeData.desc ? " - " : ""
                                    }${nodeData.desc ?? ""}`,
                                  }}
                                >
                                  {`${nodeData.title}${
                                    nodeData.desc ? " - " : ""
                                  }${nodeData.desc ?? ""}`}
                                </Text>
                              )}
                              <Tag color="geekblue">
                                {nodeData.tag || "N/D"}
                              </Tag>
                            </Space>
                            <Tooltip title="Ver informacion">
                              <Button
                                onClick={() => {
                                  setNodeData(nodeData);
                                  setOpenInfo(true);
                                }}
                                type="text"
                                icon={<InfoCircleOutlined />}
                              />
                            </Tooltip>
                            {nodeData.isExp && (
                              <Tooltip
                                title={`${
                                  nodeData.isEditable
                                    ? "Agregar hijo"
                                    : "Limite de profundidad alcanzado"
                                }`}
                              >
                                <Button
                                  type="text"
                                  disabled={!nodeData.isEditable}
                                  icon={<FolderAddOutlined />}
                                  onClick={() => {
                                    setNodeData(nodeData);
                                    if (nodeData.key === treeData.key) {
                                      showDrawerRelateAlt({
                                        ID: nodeData.expId,
                                        EXP_ID: nodeData.key,
                                        CODIGO: nodeData.title,
                                        DESCRIPCION: nodeData.desc,
                                        IS_EXPEDIENTE: nodeData.isExp,
                                        children: nodeData.children,
                                      });
                                    } else {
                                      showDrawerRelateChild(nodeData);
                                    }
                                  }}
                                />
                              </Tooltip>
                            )}
                            <Tooltip
                              title={`${
                                nodeData.isLeaf
                                  ? "Eliminar la relacion"
                                  : "Para eliminar la relacion, primero elimine los hijos"
                              }`}
                            >
                              <Button
                                type="text"
                                disabled={nodeData.children}
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  setNodeData(nodeData);
                                  handleDelete(nodeData.expId);
                                }}
                              />
                            </Tooltip>
                            {nodeData.isExp && (
                              <Tooltip title={`Navegar a detalles`}>
                                <Button
                                  type="text"
                                  icon={<LinkOutlined />}
                                  onClick={() =>
                                    router.push(`/detalles/${nodeData.key}`)
                                  }
                                />
                              </Tooltip>
                            )}
                          </Space>
                        );
                      }}
                    />
                  </>
                )}
              {data &&
                (data.length === 0 || hasNoParentAndChildren) &&
                !showEmpty && (
                  <Row justify="center" gutter={16}>
                    <Col span={24}>
                      <Space
                        direction="vertical"
                        align="center"
                        style={{ width: "100%" }}
                      >
                        <Space>
                          <Text strong>{searchData[0].CODIGO}</Text>
                          <div style={{ width: 600 }}>
                            <Text ellipsis>{searchData[0].DESCRIPCION}</Text>
                          </div>
                        </Space>
                        <Empty description="No hay asociaciones">
                          <Button
                            type="primary"
                            onClick={() => showDrawerRelate()}
                          >
                            Crear asociacion
                          </Button>
                        </Empty>
                      </Space>
                    </Col>
                  </Row>
                )}
              {showEmpty && (
                <Col span={24}>
                  <Card bordered={false} style={{ width: "100%" }}>
                    <Empty description="No se encontro el expediente solicitado. Verifique los datos ingresados" />
                  </Card>
                </Col>
              )}
            </Space>
          </Card>

          <Drawer
            title="Informacion del expediente"
            placement="right"
            onClose={() => setOpenInfo(false)}
            open={openInfo}
            width={430}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text strong>Descripcion</Text>
              <Paragraph>{selectedNodeData.desc}</Paragraph>
              {selectedNodeData.isExp && (
                <>
                  <Text strong>Fecha creación</Text>
                  <Paragraph>
                    {daysjs(selectedNodeData.created).format("DD/MM/YYYY")}
                  </Paragraph>
                </>
              )}
              <QueryClientProvider client={queryClient}>
                <ExpRelacionForm
                  id={selectedNodeData.expId}
                  handleSuccess={() => setOpenInfo(false)}
                />
              </QueryClientProvider>
            </Space>
          </Drawer>
        </Col>
      </Row>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
    {
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
    }
  );

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  if (data && !data.isAdmin) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
