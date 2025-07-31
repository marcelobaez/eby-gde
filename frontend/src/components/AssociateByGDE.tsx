import { useGetArbolExpByGdeId } from "@/hooks/useArbolExp";
import { ExpSearchResponse } from "@/types/apiGde";
import {
  createTreeNodes,
  getKeys,
  getTreeDepth,
  reverseJsonTree,
  TreeNode,
} from "@/utils";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Flex,
  Modal,
  Space,
  Spin,
  Tooltip,
  Tree,
  Typography,
} from "antd";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SearchExpForm, SearchExpFormValues } from "./SearchExpForm";
import axios from "axios";
import { ModalAssociateExp } from "./ModalAssociateExp";
import {
  DownOutlined,
  ExclamationCircleFilled,
  FileTwoTone,
  FolderTwoTone,
} from "@ant-design/icons";
import { TreeTitleRenderer } from "./TreeTitleRenderer";
import { ModalAssociateExpAlt } from "./ModalAssociateExpAlt";
import { ExpRelacionForm } from "./ExpRelacionForm";
import dayjs from "dayjs";
import { useRemoveExpMutation } from "./AssociateExp.utils";
import { canEditAsociaciones } from "@/utils/featureGuards";
import FeatureGuard from "./FeatureGuard";

const { Text, Paragraph } = Typography;
const { confirm } = Modal;

export function AssociateByGDE() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const removeExpMutation = useRemoveExpMutation();
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [searchData, setSearchData] = useState<ExpSearchResponse>();
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

  useEffect(() => {
    if (router.query.year && router.query.number) {
      const year = parseInt(router.query.year as string);
      const number = parseInt(router.query.number as string);
      setSearchParams({ year, number });
      handleSearchByGDE({ year, number });
    }
  }, [router.query.year, router.query.number]);

  // Obtener datos de la relacion por ID
  const { data, isFetching } = useGetArbolExpByGdeId(selectedExpId, {
    enabled: Boolean(selectedExpId),
  });

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

  // handler para buscar expediente por año y numero
  const handleSearchByGDE = async (values: SearchExpFormValues) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get<ExpSearchResponse[]>(
      `/api/gdeexps/${year}/${number}`
    );

    setIsSearching(false);

    const hasResults = expedientes.length > 0;

    setSearchData(expedientes[0]);
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
    setSearchData(undefined);
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
    });
  };

  const onExpand = (expandedKeysValue: React.Key[]) => {
    // if not set autoExpandParent to false, if children expanded, parent can not collapse.
    // or, you can remove all expanded children keys.
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const hasGDENoParentAndChildren =
    data &&
    data.length > 0 &&
    data[0].attributes.children.data.length === 0 &&
    data[0].attributes.parent.data === null;

  if (isFetching)
    return (
      <Flex
        justify="center"
        align="center"
        vertical
        style={{ width: "100%", height: 300 }}
      >
        <Spin size="large" />
      </Flex>
    );

  return (
    <Space size="middle" direction="vertical" style={{ width: "100%" }}>
      <SearchExpForm
        handleSubmit={handleSearchByGDE}
        handleReset={handleReset}
        isSearching={isSearching}
        initialValues={{
          year: searchParams.year,
          number: searchParams.number,
        }}
        withTitle={false}
      />
      {showEmpty && (
        <Card style={{ width: "100%" }}>
          <Empty description="No se encontro el expediente solicitado. Verifique los datos ingresados" />
        </Card>
      )}
      {data &&
        (data.length === 0 || hasGDENoParentAndChildren) &&
        !showEmpty &&
        searchData && (
          <>
            <Alert
              message="No se encontraron asociaciones"
              description="Puede crear una nueva asociacion haciendo click en el boton Asociar"
              type="info"
              showIcon
            />
            <Space direction="vertical" style={{ width: "100%" }}>
              <Flex justify="space-between">
                <div>
                  <Text strong>{searchData.CODIGO}</Text>
                  <div style={{ maxWidth: 450 }}>
                    <Tooltip title={searchData.DESCRIPCION}>
                      <Text ellipsis>{searchData.DESCRIPCION}</Text>
                    </Tooltip>
                  </div>
                </div>
                <FeatureGuard guard={canEditAsociaciones}>
                  <Button
                    type="primary"
                    onClick={() => {
                      setIsFormModalOpen(true);
                    }}
                  >
                    Asociar
                  </Button>
                </FeatureGuard>
              </Flex>
            </Space>
          </>
        )}
      {data &&
        treeData &&
        selectedExpId &&
        !showEmpty &&
        !hasGDENoParentAndChildren && (
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
                      selectedExpId={selectedExpId}
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
        destroyOnHidden
      >
        <QueryClientProvider client={queryClient}>
          {searchData && (
            <ModalAssociateExp
              targetExp={searchData}
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
        destroyOnHidden
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
