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
  Button,
  Drawer,
  Modal,
  Spin,
  message,
  ConfigProvider,
} from "antd";
import { DownOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { authOptions } from "./api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import {
  useQueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";
import {
  SearchExpForm,
  SearchExpFormValues,
} from "../components/SearchExpForm";
import axios from "axios";
import { useGetArbolExpByGdeId } from "../hooks/useArbolExp";
import {
  createTreeNodes,
  getKeys,
  reverseJsonTree,
  getTreeDepth,
  TreeNode,
} from "../utils/index";
import { ExpRelacionForm } from "../components/ExpRelacionForm";
import { ModalAssociateExp } from "../components/ModalAssociateExp";
import { ModalAssociateExistExp } from "../components/ModalAssociateExistExp";
import { api } from "../lib/axios";
import { useRouter } from "next/router";
import daysjs from "dayjs";
import { ModalAssociateExpAlt } from "../components/ModalAssociateExpAlt";
import {
  TargetExpProps,
  TreeTitleRenderer,
} from "../components/TreeTitleRenderer";
import { ExpSearchResponse } from "@/types/apiGde";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { User } from "@/types/user";

const { Paragraph, Text } = Typography;
const { info, confirm } = Modal;

export default function Documents() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState<ExpSearchResponse[]>([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedExpId, setSelectedExpId] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [selectedNodeData, setNodeData] = useState<TreeNode>();
  const [treeData, setTreeData] = useState<TreeNode>();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [currDepth, setCurrDepth] = useState(0);
  const [searchParams, setSearchParams] = useState<{
    year: number;
    number: number | null;
  }>({
    year: router.query.year
      ? parseInt(router.query.year as string)
      : new Date().getFullYear(),
    number: router.query.number
      ? parseInt(router.query.number as string)
      : null,
  });

  // Obtener datos de la relacion
  const { data, isLoading, isFetching, isSuccess } = useGetArbolExpByGdeId(
    selectedExpId,
    {
      enabled: Boolean(selectedExpId),
    }
  );

  useEffect(() => {
    if (router.query.year && router.query.number) {
      const year = parseInt(router.query.year as string);
      const number = parseInt(router.query.number as string);
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
      setTreeData(undefined);
      setExpandedKeys([]);
    }
  }, [data]);

  const removeExpMutation = useMutation({
    mutationFn: (id: number) => {
      return api.put(`/expedientes-relaciones/deleterel/${id}`);
    },
    onError: () => {
      message.error("Error al eliminar la asociacion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
      message.success("Asociacion eliminada correctamente");
    },
  });

  // modal para crear una nueva relacion
  const showDrawerRelate = () => {
    info({
      title: "Crear asociacion",
      content: (
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#006C42",
            },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <ModalAssociateExp targetExp={searchData[0]} />
          </QueryClientProvider>
        </ConfigProvider>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 800,
    });
  };

  // modal para crear una nueva relacion
  const showDrawerRelateAlt = (targetExp: TargetExpProps) => {
    info({
      title: "Buscar expediente a asociar",
      content: (
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#006C42",
            },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <ModalAssociateExpAlt
              targetExp={targetExp}
              existingIds={getKeys(treeData!)}
              onlyChild={currDepth === 4}
            />
          </QueryClientProvider>
        </ConfigProvider>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 800,
    });
  };

  // mostrar modal para asociar hijo a expediente existente
  const showDrawerRelateChild = (nodeData: TreeNode) => {
    info({
      title: "Buscar expediente a asociar",
      content: (
        <QueryClientProvider client={queryClient}>
          <ModalAssociateExistExp
            targetExp={nodeData}
            existingIds={getKeys(treeData!)}
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
  const handleSubmitMain = async (values: SearchExpFormValues) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get<ExpSearchResponse[]>(
      `/api/gdeexps/${year}/${number}`
    );

    setIsSearching(false);

    const hasResults = expedientes.length > 0;

    setSearchData(expedientes);
    if (hasResults) {
      setSelectedExpId(expedientes[0].ID.toString());
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
    setSelectedExpId("");

    setSearchParams({
      year: new Date().getFullYear(),
      number: null,
    });
    // Update the URL with the query parameters
    router.push({
      pathname: "/asociaciones",
    });
  };

  const handleDelete = (id: number) => {
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

  const onExpand = (expandedKeysValue: React.Key[]) => {
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
          <Space direction="vertical">
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              Jerarquia de expedientes
            </Typography.Title>
            <Typography.Text type="secondary">
              Consulte las asociaciones de un expediente en el sistema GDE
              utilizando el formulario al pie
            </Typography.Text>
          </Space>
        </Col>
        <Col span={24}>
          <Card
            // title={`Jerarquia de expedientes`}
            bordered={false}
            style={{ width: "100%", minHeight: "calc(100vh - 250px)" }}
          >
            <Space size="middle" direction="vertical" style={{ width: "100%" }}>
              <Row justify="center" gutter={16}>
                <Col span={24}>
                  <SearchExpForm
                    handleSubmit={handleSubmitMain}
                    handleReset={handleReset}
                    isSearching={isSearching}
                    initialValues={{
                      year: searchParams.year,
                      number: searchParams.number,
                    }}
                  />
                </Col>
              </Row>
              {(isLoading || isFetching) && <Spin size="large" />}
              {data &&
                isSuccess &&
                // Object.keys(treeData).length > 0 &&
                treeData &&
                selectedExpId &&
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
                          <TreeTitleRenderer
                            nodeData={nodeData}
                            setNodeData={setNodeData}
                            setOpenInfo={setOpenInfo}
                            showDrawerRelateAlt={showDrawerRelateAlt}
                            showDrawerRelateChild={showDrawerRelateChild}
                            handleDelete={handleDelete}
                            selectedExpId={selectedExpId}
                            treeData={treeData}
                          />
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
            {selectedNodeData && (
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
            )}
          </Drawer>
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

  const { data } = await axios.get<User>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/me?populate=role`,
    {
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
    }
  );

  const canAccess =
    data.role.name.toLowerCase() === "administrator" ||
    data.role.name.toLowerCase() === "expobras";

  if (data && !canAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}
