import React, { useEffect, useState } from "react";
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
} from "antd";
import {
  DeleteOutlined,
  ExclamationCircleFilled,
  FolderAddOutlined,
  InfoCircleOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useQueryClient, QueryClientProvider, useMutation } from "react-query";
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

const { Paragraph, Text } = Typography;
const { info, confirm } = Modal;

const createTreeData = (data) => {
  const reversedJson = reverseJsonTree(data[0]);
  return createTreeNodes(reversedJson, 4);
};

export function ArbolExp({ exp: { id, desc, codigo, estado } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEmpty, setShowEmpty] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [selectedNodeData, setNodeData] = useState({});
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [currDepth, setCurrDepth] = useState(0);

  // Obtener datos de la relacion
  const { data, isLoading, isSuccess } = useGetArbolExpByGdeId(id);

  const treeData = data && data.length > 0 ? createTreeData(data) : [];

  useEffect(() => {
    if (data && data.length > 0) {
      setExpandedKeys(getKeys(treeData));
      setCurrDepth(getTreeDepth(treeData));
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
        // Modal.destroyAll();
      },
    }
  );

  // modal para crear una nueva relacion
  const showDrawerRelate = () => {
    info({
      title: "Buscar expediente a asociar",
      content: (
        <QueryClientProvider client={queryClient}>
          <ModalAssociateExp
            targetExp={{
              ID: id,
              DESCRIPCION: desc,
              CODIGO: codigo,
              ESTADO: estado,
            }}
          />
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
  // console.log(data);

  // console.log(treeData);

  return (
    <Row gutter={[16, 16]} justify="center">
      <Col span={24}>
        <Space size="middle" direction="vertical" style={{ width: "100%" }}>
          {isLoading && <Spin size="large" />}
          {data &&
            isSuccess &&
            Object.keys(treeData).length > 0 &&
            !hasNoParentAndChildren && (
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
                        {nodeData.key === String(id) ? (
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
                            {`${nodeData.title}${nodeData.desc ? " - " : ""}${
                              nodeData.desc ?? ""
                            }`}
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
                            {`${nodeData.title}${nodeData.desc ? " - " : ""}${
                              nodeData.desc ?? ""
                            }`}
                          </Text>
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
                            icon={<FolderAddOutlined />}
                            disabled={!nodeData.isEditable}
                            onClick={() => {
                              setNodeData(nodeData);
                              if (
                                nodeData.key === treeData.key &&
                                currDepth < 3
                              ) {
                                showDrawerRelateAlt({
                                  ID: nodeData.key,
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
                          !nodeData.children
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
            )}
          {data && (data.length === 0 || hasNoParentAndChildren) && (
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

        <Drawer
          title="Informacion del expediente"
          placement="right"
          onClose={() => setOpenInfo(false)}
          open={openInfo}
        >
          <Space direction="vertical">
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
  );
}
