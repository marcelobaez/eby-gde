import React, { useEffect, useState } from "react";
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
} from "antd";
import { DownOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import {
  useQueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";
import { useGetArbolExpByGdeId } from "../hooks/useArbolExp";
import {
  createTreeNodes,
  getKeys,
  reverseJsonTree,
  getTreeDepth,
  TreeNode,
} from "../utils/index";
import { ExpRelacionForm } from "./ExpRelacionForm";
import { ModalAssociateExp } from "./ModalAssociateExp";
import { ModalAssociateExistExp } from "./ModalAssociateExistExp";
import { ModalAssociateExpAlt } from "./ModalAssociateExpAlt";
import { api } from "../lib/axios";
import daysjs from "dayjs";
import { TargetExpProps, TreeTitleRenderer } from "./TreeTitleRenderer";
import { ExpRelacion } from "@/types/expRelacion";

const { Paragraph, Text } = Typography;
const { info, confirm } = Modal;

const createTreeData = (data: ExpRelacion) => {
  const reversedJson = reverseJsonTree(data);
  return createTreeNodes(reversedJson, 4);
};

export type ArbolExpProps = {
  exp: {
    id: string;
    desc: string;
    codigo: string;
    estado: string;
    fechaCreacion: string;
  };
};

export function ArbolExp({
  exp: { id, desc, codigo, estado, fechaCreacion },
}: ArbolExpProps) {
  const queryClient = useQueryClient();
  const [showEmpty, setShowEmpty] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [selectedNodeData, setNodeData] = useState<TreeNode>();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [currDepth, setCurrDepth] = useState(0);
  const [treeData, setTreeData] = useState<TreeNode>();

  // Obtener datos de la relacion
  const { data, isLoading, isSuccess } = useGetArbolExpByGdeId(id);

  useEffect(() => {
    if (data && data.length > 0) {
      const newTreeData = createTreeData(data[0]);
      setTreeData(newTreeData);
      setExpandedKeys(getKeys(newTreeData));
      setCurrDepth(getTreeDepth(newTreeData));
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
      title: "Buscar expediente a asociar",
      content: (
        <QueryClientProvider client={queryClient}>
          <ModalAssociateExp
            targetExp={{
              ID: parseInt(id),
              DESCRIPCION: desc,
              CODIGO: codigo,
              ESTADO: estado,
              FECHA_CREACION: fechaCreacion,
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
  // const showDrawerRelateAlt = (targetExp: TargetExpProps) => {
  //   info({
  //     title: "Buscar expediente a asociar",
  //     content: (
  //       <QueryClientProvider client={queryClient}>
  //         <ModalAssociateExpAlt
  //           targetExp={targetExp}
  //           existingIds={getKeys(treeData!)}
  //           onlyChild={currDepth === 4}
  //         />
  //       </QueryClientProvider>
  //     ),
  //     centered: true,
  //     footer: null,
  //     closable: true,
  //     width: 800,
  //   });
  // };

  // // mostrar modal para asociar hijo a expediente existente
  // const showDrawerRelateChild = (nodeData: TreeNode) => {
  //   info({
  //     title: "Buscar expediente a asociar",
  //     content: (
  //       <QueryClientProvider client={queryClient}>
  //         <ModalAssociateExistExp
  //           targetExp={nodeData}
  //           existingIds={getKeys(treeData!)}
  //         />
  //       </QueryClientProvider>
  //     ),
  //     centered: true,
  //     footer: null,
  //     closable: true,
  //     width: 800,
  //   });
  // };

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
    <Row gutter={[16, 16]} justify="center">
      <Col span={24}>
        <Space size="middle" direction="vertical" style={{ width: "100%" }}>
          {isLoading && <Spin size="large" />}
          {data &&
            isSuccess &&
            // Object.keys(treeData).length > 0 &&
            treeData &&
            // !Array.isArray(treeData) &&
            !hasNoParentAndChildren && (
              <Tree
                selectable={false}
                showLine
                showIcon
                treeData={[treeData]}
                expandedKeys={expandedKeys}
                switcherIcon={<DownOutlined />}
                autoExpandParent={autoExpandParent}
                onExpand={onExpand}
                // titleRender={(nodeData) => {
                //   return (
                //     <TreeTitleRenderer
                //       nodeData={nodeData}
                //       setNodeData={setNodeData}
                //       setOpenInfo={setOpenInfo}
                //       // showDrawerRelateAlt={showDrawerRelateAlt}
                //       // showDrawerRelateChild={showDrawerRelateChild}
                //       handleDelete={handleDelete}
                //       selectedExpId={id}
                //       treeData={treeData}
                //     />
                //   );
                // }}
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
          width={430}
        >
          {selectedNodeData && (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text strong>Descripcion</Text>
              <Paragraph>{selectedNodeData.desc}</Paragraph>
              {selectedNodeData!.isExp && (
                <>
                  <Text strong>Fecha creación</Text>
                  <Paragraph>
                    {daysjs(selectedNodeData!.created).format("DD/MM/YYYY")}
                  </Paragraph>
                </>
              )}
              <QueryClientProvider client={queryClient}>
                <ExpRelacionForm
                  id={selectedNodeData!.expId}
                  handleSuccess={() => setOpenInfo(false)}
                />
              </QueryClientProvider>
            </Space>
          )}
        </Drawer>
      </Col>
    </Row>
  );
}
