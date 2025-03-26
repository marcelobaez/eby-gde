import { useGetArbolExpByExpCode } from "@/hooks/useArbolExp";
import { ExpDoc, ExpDocDetailResponse } from "@/types/expDoc";
import {
  createTreeNodes,
  getKeys,
  getTreeDepth,
  reverseJsonTree,
  sedesCodes,
  TreeNode,
} from "@/utils";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Flex,
  Modal,
  Space,
  Spin,
  Tooltip,
  Tree,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import {
  DownOutlined,
  ExclamationCircleFilled,
  FileTwoTone,
  FolderTwoTone,
} from "@ant-design/icons";
import { TreeTitleRenderer } from "./TreeTitleRenderer";
import { ExpRelacionForm } from "./ExpRelacionForm";
import dayjs from "dayjs";
import { SearchDocExpForm } from "./SearchDocExpForm";
import { useRemoveExpMutation } from "./AssociateExp.utils";
import { ModalAssociateExpDoc } from "./ModalAssociateExpDoc";
import { ModalAssociateExpAlt } from "./ModalAssociateExpAlt";

const { Text, Paragraph } = Typography;
const { confirm } = Modal;

export function AssociateByDoc({
  mode,
}: {
  mode: "verify" | "associate" | "search";
}) {
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const removeExpMutation = useRemoveExpMutation();
  const queryClient = useQueryClient();
  const [selectedExpCode, setSelectedExpCode] = useState<string>("");
  const [selectedExpDoc, setSelectedExpDoc] =
    useState<ExpDocDetailResponse["data"]>();
  const [openInfo, setOpenInfo] = useState(false);
  const [selectedNodeData, setNodeData] = useState<TreeNode>();
  const [treeData, setTreeData] = useState<TreeNode>();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [currDepth, setCurrDepth] = useState(0);

  // Obtener datos de la relacion por ExpCode
  const { data: expdDocData, isFetching } = useGetArbolExpByExpCode(
    selectedExpCode,
    {
      enabled: Boolean(selectedExpCode),
    }
  );

  useEffect(() => {
    if (expdDocData && expdDocData.length > 0) {
      const reversedJson = reverseJsonTree(expdDocData[0]);
      const newTreeData = createTreeNodes(reversedJson, 4);
      setCurrDepth(getTreeDepth(newTreeData));
      setExpandedKeys(getKeys(newTreeData));
      setTreeData(newTreeData);
    } else {
      setTreeData(undefined);
      setExpandedKeys([]);
    }
  }, [expdDocData]);

  const handleCheckRelation = useCallback((values?: ExpDoc) => {
    if (values) {
      setSelectedExpDoc(values);
      setSelectedExpCode(
        `${sedesCodes[values.attributes.SEDE as keyof typeof sedesCodes]}-${
          values.attributes.NRO_ORDEN
        }-${values.attributes.NRO_EXPE}-${values.attributes.CORRESPO}`
      );
    } else {
      setSelectedExpDoc(undefined);
      setSelectedExpCode("");
    }
  }, []);

  const handleDelete = (id: number) => {
    confirm({
      title: "Esta seguro que desea eliminar esta relacion?",
      icon: <ExclamationCircleFilled />,
      content:
        "Esta accion no se puede deshacer. Todos los elementos asociados a este expediente seran eliminados.",
      onOk() {
        removeExpMutation.mutate(id);
      },
    });
  };

  const onExpand = (expandedKeysValue: React.Key[]) => {
    // if not set autoExpandParent to false, if children expanded, parent can not collapse.
    // or, you can remove all expanded children keys.
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const hasDOCNoParentAndChildren =
    expdDocData &&
    expdDocData.length > 0 &&
    expdDocData[0].attributes.children.data.length === 0 &&
    expdDocData[0].attributes.parent.data === null;

  return (
    <Space size="middle" direction="vertical" style={{ width: "100%" }}>
      <SearchDocExpForm handleSubmit={handleCheckRelation} mode={mode} />
      {expdDocData &&
        (expdDocData.length === 0 || hasDOCNoParentAndChildren) &&
        selectedExpDoc && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert
              message={
                mode === "verify" || mode === "associate"
                  ? "No se encontraron asociaciones"
                  : "No se encontraron resultados"
              }
              description={
                mode === "verify" || mode === "associate"
                  ? "Puede crear una nueva asociacion haciendo click en el boton Asociar"
                  : ""
              }
            />
            <Flex justify="space-between">
              <div>
                <Text
                  strong
                >{`Nro Orden: ${selectedExpDoc.attributes.NRO_ORDEN} - Nro Expte: ${selectedExpDoc.attributes.NRO_EXPE} - Causante: ${selectedExpDoc.attributes.CAUSANTE}`}</Text>
                <div style={{ maxWidth: 450 }}>
                  <Tooltip title={selectedExpDoc.attributes.ASUNTO}>
                    <Text ellipsis>{selectedExpDoc.attributes.ASUNTO}</Text>
                  </Tooltip>
                </div>
              </div>
              {mode === "associate" && (
                <Space direction="vertical" size="small">
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      setIsFormModalOpen(true);
                    }}
                  >
                    Asociar
                  </Button>
                </Space>
              )}
            </Flex>
          </Space>
        )}
      {expdDocData &&
        treeData &&
        selectedExpCode &&
        !hasDOCNoParentAndChildren && (
          <Card title={`Jerarquia de Expedientes`} style={{ minHeight: 300 }}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Flex gap="middle" align="center">
                <FolderTwoTone twoToneColor="#f59e0b" />
                <Text>GDE</Text>
                <FolderTwoTone />
                <Text>Expediente Fisico</Text>
                <FileTwoTone />
                <Text>Categoria</Text>
              </Flex>
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
                      onAssociate={() => setIsTreeModalOpen(true)}
                      handleDelete={handleDelete}
                      selectedExpId={selectedExpCode}
                      treeData={treeData}
                    />
                  );
                }}
              />
            </Space>
          </Card>
        )}
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
            {selectedNodeData.isExp ||
              (selectedNodeData.isExpDoc && (
                <>
                  <Text strong>Fecha creación</Text>
                  <Paragraph>
                    {dayjs(selectedNodeData.created).format("DD/MM/YYYY")}
                  </Paragraph>
                </>
              ))}
            <QueryClientProvider client={queryClient}>
              <ExpRelacionForm
                id={selectedNodeData.expId}
                handleSuccess={() => setOpenInfo(false)}
              />
            </QueryClientProvider>
          </Space>
        )}
      </Drawer>
      {/* Modal para asociar desde formulario de busqueda */}
      <Modal
        footer={null}
        centered
        width={1000}
        styles={{ content: { minHeight: 700 } }}
        open={isFormModalOpen}
        onCancel={() => setIsFormModalOpen(false)}
        destroyOnClose
      >
        <QueryClientProvider client={queryClient}>
          {selectedExpDoc && (
            <ModalAssociateExpDoc
              targetExpDoc={selectedExpDoc}
              onSuccess={() => setIsFormModalOpen(false)}
            />
          )}
        </QueryClientProvider>
      </Modal>
      {/* Modal para asociar desde arbol de expedientes */}
      <Modal
        title="Buscar expediente a asociar"
        footer={null}
        centered
        width={1000}
        styles={{ content: { minHeight: 700 } }}
        open={isTreeModalOpen}
        onCancel={() => setIsTreeModalOpen(false)}
        destroyOnClose
      >
        <QueryClientProvider client={queryClient}>
          {selectedNodeData && treeData && (
            <ModalAssociateExpAlt
              targetExp={{
                ID: selectedNodeData.expId,
                EXP_ID: selectedNodeData.key,
                CODIGO: selectedNodeData.title,
                DESCRIPCION: selectedNodeData.desc,
                IS_EXPEDIENTE: selectedNodeData.isExp,
                IS_EXPEDIENTEDOC: selectedNodeData.isExpDoc,
                children: selectedNodeData.children,
              }}
              isRoot={selectedNodeData.key === treeData?.key}
              existingIds={getKeys(treeData)}
              onlyChild={currDepth < 6}
              onSuccess={() => setIsTreeModalOpen(false)}
            />
          )}
        </QueryClientProvider>
      </Modal>
    </Space>
  );
}
