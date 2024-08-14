import { api } from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

export const useRemoveExpMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
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
      queryClient.invalidateQueries({
        queryKey: ["arbolExpcode"],
      });
      message.success("Asociacion eliminada correctamente");
    },
  });
};
