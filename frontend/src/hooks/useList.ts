import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { message } from "antd";

export function useRemoveExpMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: number) => await api.delete(`/expedientes/${id}`),
    onError: () => {
      message.error("Error al eliminar el expediente");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
      queryClient.invalidateQueries({ queryKey: ["expedientes"] });
      message.success("Quitado de la lista");
    },
  });

  return mutation;
}

export function useUpdateExpMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (body: { id: number; duracion_esperada: number }) => {
      const { id, duracion_esperada } = body;
      return await api.put(`/expedientes/${id}`, {
        data: {
          duracion_esperada,
        },
      });
    },
    onError: () => {
      message.error("Error al actualizar el expediente");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
      queryClient.invalidateQueries({ queryKey: ["expedientes"] });
      message.success("Actualizado");
    },
  });

  return mutation;
}

export function useAddExpMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (body: { expId: number; listId: string }) => {
      const { expId, listId } = body;
      return await api.post("/expedientes", {
        data: {
          id_expediente: expId,
          lista: listId,
        },
      });
    },
    onError: () => {
      message.error("Error al agregar a la lista");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
      message.success("Agregado a la lista");
    },
  });

  return mutation;
}
