import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { App } from "antd";
import { ExpedienteUpdateRequest } from "@/types/expediente";

export function useRemoveExpMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: number) => await api.delete(`/expedientes/${id}`),
    onError: () => {
      message.error("Error al eliminar el expediente");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listas"] });
      await queryClient.invalidateQueries({ queryKey: ["expedientes"] });
      message.success("Quitado de la lista");
    },
  });

  return mutation;
}

export function useUpdateExpMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (body: ExpedienteUpdateRequest) => {
      // const { id, duracion_esperada } = body;
      return await api.put(`/expedientes/${body.id}`, {
        data: body,
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
  const { message } = App.useApp();
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listas"] });
      message.success("Agregado a la lista");
    },
  });

  return mutation;
}

export function useToggleReminderMovMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (body: {
      id: number;
      id_expediente: string;
      ult_mov_id: number | null;
      send_reminder_mov: boolean;
    }) => {
      const { id, id_expediente, ult_mov_id, send_reminder_mov } = body;

      // If turning ON and ult_mov_id is null, fetch the latest movement ID first
      if (send_reminder_mov && ult_mov_id === null) {
        try {
          const response = await fetch(`/api/gdelastmov/${id_expediente}`);
          const data = await response.json();

          if (response.ok && data.lastMovId) {
            // Update with both send_reminder_mov and ult_mov_id
            return await api.put(`/expedientes/${id}`, {
              data: {
                send_reminder_mov: true,
                ult_mov_id: data.lastMovId,
              },
            });
          } else {
            throw new Error("Could not fetch latest movement ID");
          }
        } catch (error) {
          throw new Error("Failed to initialize movement tracking");
        }
      } else {
        // Normal update - just toggle send_reminder_mov
        return await api.put(`/expedientes/${id}`, {
          data: { send_reminder_mov },
        });
      }
    },
    onError: () => {
      message.error("Error al actualizar configuración de recordatorios");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
      queryClient.invalidateQueries({ queryKey: ["expedientes"] });
      message.success("Configuración actualizada");
    },
  });

  return mutation;
}
