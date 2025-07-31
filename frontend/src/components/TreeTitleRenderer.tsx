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
import FeatureGuard from "./FeatureGuard";
import { canEditAsociaciones } from "@/utils/featureGuards";

const { Text } = Typography;

type SortDirection = "before" | "after";

export type TargetExpProps = {
  ID: number;
  EXP_ID: string;
  CODIGO: string;
  DESCRIPCION: string;
  IS_EXPEDIENTE: boolean;
  IS_EXPEDIENTEDOC: boolean;
  children: TreeNode["children"];
};

type TreeTitleRendererProps = {
  nodeData: TreeNode;
  setNodeData: (value: TreeNode) => void;
  setOpenInfo: (value: boolean) => void;
  handleDelete: (id: number) => void;
  onAssociate: () => void;
  treeData: TreeNode;
  selectedExpId: string;
};

export function TreeTitleRenderer({
  nodeData,
  setNodeData,
  setOpenInfo,
  onAssociate,
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
    onError: () => {
      message.error("Error al actualizar la posicion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
      queryClient.invalidateQueries({
        queryKey: ["arbolExpcode"],
      });
      message.success("Posicion actualizada");
    },
  });

  const setNewPosition = (targetNode: TreeNode, direction: SortDirection) => {
    updateExpMutation.mutate({
      targetId: targetNode.expId,
      destId: findAdjacentExpId([treeData], targetNode.expId, direction)!,
      direction,
    });
  };

  const isExp = Boolean(nodeData.isExpDoc || nodeData.isExp);

  return (
    <Space>
      <Space>
        {nodeData.key === selectedExpId ? (
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
      {isExp && (
        <FeatureGuard guard={canEditAsociaciones}>
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
                onAssociate();
              }}
            />
          </Tooltip>
        </FeatureGuard>
      )}
      <FeatureGuard guard={canEditAsociaciones}>
        <Tooltip
          title={`${
            nodeData.children.length === 0
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
      </FeatureGuard>
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
        <FeatureGuard guard={canEditAsociaciones}>
          <Tooltip title={`Mover hacia arriba`}>
            <Button
              type="text"
              icon={<CaretUpOutlined />}
              onClick={() => setNewPosition(nodeData, "before")}
            />
          </Tooltip>
        </FeatureGuard>
      )}
      {nodeData.key !== treeData.key && !nodeData.isLast && (
        <FeatureGuard guard={canEditAsociaciones}>
          <Tooltip title={`Mover hacia abajo`}>
            <Button
              type="text"
              icon={<CaretDownOutlined />}
              onClick={() => setNewPosition(nodeData, "after")}
            />
          </Tooltip>
        </FeatureGuard>
      )}
    </Space>
  );
}
