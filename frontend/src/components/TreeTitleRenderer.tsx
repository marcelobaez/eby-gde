import {
  CaretDownOutlined,
  CaretUpOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  InfoCircleOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { Button, Space, Tag, Tooltip, Typography, message } from "antd";
import { useRouter } from "next/router";
import { TreeNode, findAdjacentExpId, findParentExpId } from "../utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

const { Text } = Typography;

type SortDirection = "before" | "after";

export type TargetExpProps = {
  ID: number;
  EXP_ID: string;
  CODIGO: string;
  DESCRIPCION: string;
  IS_EXPEDIENTE: boolean;
  children: TreeNode["children"];
};

type TreeTitleRendererProps = {
  nodeData: TreeNode;
  setNodeData: (value: TreeNode) => void;
  setOpenInfo: (value: boolean) => void;
  showDrawerRelateAlt: (value: TargetExpProps) => void;
  showDrawerRelateChild: (TreeNode: any) => void;
  handleDelete: (id: number) => void;
  treeData: TreeNode;
  selectedExpId: string;
};

export function TreeTitleRenderer({
  nodeData,
  setNodeData,
  setOpenInfo,
  showDrawerRelateAlt,
  showDrawerRelateChild,
  handleDelete,
  treeData,
  selectedExpId,
}: TreeTitleRendererProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateExpMutation = useMutation({
    mutationFn: ({
      targetId,
      destId,
      direction,
    }: {
      targetId: number;
      destId: number;
      direction: SortDirection;
    }) =>
      api.put(
        `/expedientes-relaciones/${findParentExpId([treeData], targetId)}`,
        {
          data: {
            children: {
              connect: [
                {
                  id: targetId,
                  position: {
                    [direction]: destId,
                  },
                },
              ],
            },
          },
        }
      ),
    // On failure, roll back to the previous value
    onError: (err, variables, previousValue) => {
      message.error("Error al actualizar la posicion");
      queryClient.setQueryData(["arbolExp"], previousValue);
    },
    onSuccess: (data, variables, context) => {
      message.success("Posicion actualizada");
    },
    // After success or failure, refetch the todos query
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
    },
  });

  const setNewPosition = (targetNode: TreeNode, direction: SortDirection) => {
    updateExpMutation.mutate({
      targetId: targetNode.expId,
      destId: findAdjacentExpId([treeData], targetNode.expId, direction)!,
      direction,
    });
  };

  return (
    <Space>
      <Space>
        {nodeData.key === String(selectedExpId) ? (
          <Text
            style={{ width: 400 }}
            ellipsis={{
              tooltip: `${nodeData.title}${nodeData.desc ? " - " : ""}${
                nodeData.desc ?? ""
              }`,
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
              tooltip: `${nodeData.title}${nodeData.desc ? " - " : ""}${
                nodeData.desc ?? ""
              }`,
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
          disabled={nodeData.children.length > 0}
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
            onClick={() => router.push(`/detalles/${nodeData.key}`)}
          />
        </Tooltip>
      )}
      {nodeData.key !== treeData.key && !nodeData.isFirst && (
        <Tooltip title={`Mover hacia arriba`}>
          <Button
            type="text"
            icon={<CaretUpOutlined />}
            onClick={() => setNewPosition(nodeData, "before")}
          />
        </Tooltip>
      )}
      {nodeData.key !== treeData.key && !nodeData.isLast && (
        <Tooltip title={`Mover hacia abajo`}>
          <Button
            type="text"
            icon={<CaretDownOutlined />}
            onClick={() => setNewPosition(nodeData, "after")}
          />
        </Tooltip>
      )}
    </Space>
  );
}
