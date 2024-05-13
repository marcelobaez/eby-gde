import { Button, Input, Space, message, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useEffect } from "react";

const { Text } = Typography;

type EditCategoryFormProps = {
  id: number;
  formData: { nombre: string };
  onSubmitSuccess: () => void;
  onCancel: () => void;
};

export function EditCategoryForm({
  formData,
  id,
  onSubmitSuccess,
  onCancel,
}: EditCategoryFormProps) {
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

  const updateTagMutation = useMutation({
    mutationFn: (data: EditCategoryFormProps["formData"]) => {
      return api.put(`/expedientes-tipos/${id}`, {
        data,
      });
    },
    onMutate: async (text) => {
      await queryClient.cancelQueries({
        queryKey: ["tags"],
      });

      const previousValue = queryClient.getQueryData(["tags"]);

      return previousValue;
    },
    // On failure, roll back to the previous value
    onError: (err, variables, previousValue) => {
      message.error("Error al actualizar la categoria");
      queryClient.setQueryData(["tags"], previousValue);
    },
    onSuccess: (data, variables, context) => {
      message.success("Categoria actualizada correctamente");
      onSubmitSuccess();
    },
    // After success or failure, refetch the todos query
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["tags"],
      });
    },
  });

  const onSubmit = (data: EditCategoryFormProps["formData"]) => {
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
