import { Button, Input, Space, message, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";
import { api } from "../lib/axios";
import { useEffect } from "react";

const { Text } = Typography;

export function EditCategoryForm({ formData, id, onSubmitSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    values: formData,
  });

  // Call reset whenever onCancel changes
  useEffect(() => {
    reset();
  }, [onCancel]);

  const updateTagMutation = useMutation(
    (data) => {
      return api.put(`/expedientes-tipos/${id}`, {
        data,
      });
    },
    {
      onMutate: async (text) => {
        await queryClient.cancelQueries(["tags"]);

        const previousValue = queryClient.getQueryData(["tags"]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["tags"], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Categoria actualizada correctamente");
        onSubmitSuccess();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["tags"]);
      },
    }
  );

  const onSubmit = (data) => {
    updateTagMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Controller
          name="nombre"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Input {...field} placeholder="Nombre" style={{ width: "100%" }} />
          )}
        />
        {errors.nombre && <Text type="danger">El titulo es obligatorio</Text>}
        <Button type="primary" htmlType="submit">
          Guardar
        </Button>
      </Space>
    </form>
  );
}
