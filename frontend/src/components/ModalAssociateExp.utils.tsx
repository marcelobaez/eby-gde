import { api } from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { ExpRelacionCreateRequest } from "@/types/expRelacion";

export type ExpRelationRequest = {
  parent: ExpRelacionCreateRequest;
  child: ExpRelacionCreateRequest;
};

export const useCreateExpMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ExpRelationRequest) => {
      return api.post("/expedientes-relaciones/createnew", { data: body });
    },
    onError: () => {
      message.error("Error al crear la relacion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
      queryClient.invalidateQueries({
        queryKey: ["arbolExpcode"],
      });
      message.success("Relacion creada");
    },
  });
};
