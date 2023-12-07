import { useMutation, useQueryClient } from "react-query";
import { api } from "../lib/axios";
import { message } from "antd";

export function useRemoveExpMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation((id) => api.delete(`/expedientes/${id}`), {
    // Optimistically update the cache value on mutate, but store
    // the old value and return it so that it's accessible in case of
    // an error
    onMutate: async (text) => {
      await queryClient.cancelQueries("expedientes");

      const previousValue = queryClient.getQueryData("expedientes");

      return previousValue;
    },
    // On failure, roll back to the previous value
    onError: (err, variables, previousValue) => {
      message.error(err.response.data);
      queryClient.setQueryData("expedientes", previousValue);
    },
    onSuccess: (data, variables, context) => {
      message.success("Quitado de la lista");
    },
    // After success or failure, refetch the todos query
    onSettled: () => {
      queryClient.invalidateQueries("expedientes");
    },
  });

  return mutation;
}

export function useUpdateExpMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation(
    (body) => {
      const { id, duracion_esperada } = body;
      return api.put(`/expedientes/${id}`, {
        data: {
          duracion_esperada,
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries("expedientes");

        const previousValue = queryClient.getQueryData("expedientes");

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData("expedientes", previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Actualizado");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("expedientes");
      },
    }
  );

  return mutation;
}

export function useAddExpMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation(
    ({ expId, listId }) => {
      return api.post("/expedientes", {
        data: {
          id_expediente: expId,
          lista: listId,
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries("expedientes");

        const previousValue = queryClient.getQueryData("expedientes");

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData("expedientes", previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Agregado a la lista");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("expedientes");
      },
    }
  );

  return mutation;
}
