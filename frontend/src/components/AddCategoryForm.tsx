import { Button, Input, Space, message, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

const { Text } = Typography;

type FormData = {
  nombre: string;
};

export function AddCategoryForm({
  onSubmitSuccess,
}: {
  onSubmitSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      nombre: "",
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (data: FormData) => {
      return api.post(`/expedientes-tipos`, {
        data,
      });
    },
    onMutate: async (newCat) => {
      await queryClient.cancelQueries({
        queryKey: ["tags"],
      });

      const previousValue = queryClient.getQueryData(["tags"]);

      return previousValue;
    },
    // On failure, roll back to the previous value
    onError: (err, variables, previousValue) => {
      message.error("Error al agregar la categoria");
      queryClient.setQueryData(["tags"], previousValue);
    },
    onSuccess: (data, variables, context) => {
      message.success("Categoria agregada correctamente");
      onSubmitSuccess();
    },
    // After success or failure, refetch the todos query
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["tags"],
      });
    },
  });

  const onSubmit = (data: FormData) => {
    addTagMutation.mutate(data);
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
