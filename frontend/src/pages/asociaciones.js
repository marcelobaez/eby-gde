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
} from "antd";
import {
  DeleteOutlined,
  ExclamationCircleFilled,
  FolderAddOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { useQueryClient, QueryClientProvider } from "react-query";
import { SearchExpForm } from "../components/SearchExpForm";
import axios from "axios";
import { useGetArbolExpByGdeId } from "../hooks/useArbolExp";
import { createTreeNodes, getKeys } from "../utils/index";
import { ExpRelacionForm } from "../components/ExpRelacionForm";
import { ModalAssociateExp } from "../components/ModalAssociateExp";
import { ModalAssociateExistExp } from "../components/ModalAssociateExistExp";

const { Paragraph, Text } = Typography;
const { info, confirm } = Modal;

export default function Documents() {
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

  // Obtener datos de la relacion
  const { data, isLoading, isError } = useGetArbolExpByGdeId(selectedExpId, {
    enabled: Boolean(selectedExpId),
  });

  useEffect(() => {
    if (data && data.length > 0) {
      const newTreeData = createTreeNodes(data[0], 6);
      setExpandedKeys(getKeys(newTreeData));
      setTreeData(newTreeData);
    }
  }, [data]);

  // modal para crear una nueva relacion
  const showDrawerRelate = () => {
    info({
      title: "Buscar expediente a asociar",
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

  // mostrar modal para asociar hijo a expediente existente
  const showDrawerRelateChild = () => {
    info({
      title: "Buscar expediente a asociar",
      content: (
        <QueryClientProvider client={queryClient}>
          <ModalAssociateExistExp
            targetExp={selectedNodeData}
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
    }
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
    setSelectedExpId(null);
  };

  const handleDelete = () => {
    confirm({
      title: "Esta seguro que desea eliminar esta relacion?",
      icon: <ExclamationCircleFilled />,
      content:
        "Esta accion no se puede deshacer. Todos los elementos asociados a este expediente seran eliminados.",
      onOk() {
        console.log("OK");
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
  // console.log(data);

  // console.log(treeData);

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
                    />
                  </Card>
                </Col>
              </Row>
              {isLoading && <Spin size="large" />}
              {data && !isLoading && data.length > 0 && (
                <>
                  <Tree
                    selectable={false}
                    showLine
                    showIcon
                    treeData={[treeData]}
                    expandedKeys={expandedKeys}
                    autoExpandParent={autoExpandParent}
                    onExpand={onExpand}
                    titleRender={(nodeData) => {
                      return (
                        <Space>
                          <Space>
                            {nodeData.key === String(selectedExpId) ? (
                              <Text strong mark>
                                {nodeData.title}
                              </Text>
                            ) : (
                              <span>{nodeData.title}</span>
                            )}
                            <Tag color="geekblue">{nodeData.tag || "N/D"}</Tag>
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
                          <Tooltip title="Agregar hijo">
                            <Button
                              type="text"
                              icon={<FolderAddOutlined />}
                              onClick={() => {
                                setNodeData(nodeData);
                                showDrawerRelateChild();
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Eliminar de la relacion">
                            <Button
                              type="text"
                              icon={<DeleteOutlined twoToneColor="#eb2f96" />}
                              onClick={() => {
                                setNodeData(nodeData);
                                handleDelete();
                              }}
                            />
                          </Tooltip>
                        </Space>
                      );
                    }}
                  />
                </>
              )}
              {data && data.length === 0 && (
                <Empty description="No hay asociaciones">
                  <Button type="primary" onClick={() => showDrawerRelate()}>
                    Crear asociacion
                  </Button>
                </Empty>
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
          >
            <Space direction="vertical">
              <Text strong>Descripcion</Text>
              <Paragraph>{selectedNodeData.desc}</Paragraph>
              <QueryClientProvider client={queryClient}>
                <ExpRelacionForm id={selectedNodeData.expId} />
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
