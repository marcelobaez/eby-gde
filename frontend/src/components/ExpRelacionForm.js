import { Input, Select, Spin, Form, Button } from "antd";
import { Controller, useForm } from "react-hook-form";
import { useGetExpRelationById } from "../hooks/useArbolExp";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { api } from "../lib/axios";

const { TextArea } = Input;

export function ExpRelacionForm({ id }) {
  const queryClient = useQueryClient();
  // Obtener las etiquetas de la base de datos
  const { data: tagsData } = useQuery(
    "tags",
    async () => await api.get("/expedientes-tipos")
  );
  // console.log(tagsData);

  // Obtener los datos de la relación
  const { data, isLoading, isError } = useGetExpRelationById(id);

  // console.log(data);

  const {
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm({
    values: {
      notas: data ? data.attributes.notas : "",
      expediente_tipo:
        data &&
        data.attributes.expediente_tipo &&
        data.attributes.expediente_tipo.data
          ? {
              value: data.attributes.expediente_tipo.data.id,
              label: data.attributes.expediente_tipo.data.attributes.nombre,
            }
          : null,
    },
    // resetOptions: {
    //   keepDirtyValues: true, // keep dirty fields unchanged, but update defaultValues
    // },
  });

  const updateExpRelMutation = useMutation(
    (body) => {
      const { expediente_tipo, notas } = body;
      return api.put(`/expedientes-relaciones/${id}`, {
        data: { notas, expediente_tipo },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["expRelDetails", id]);

        const previousValue = queryClient.getQueryData(["expRelDetails", id]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["expRelDetails", id], previousValue);
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["expRelDetails", id]);
        queryClient.invalidateQueries("arbolExp");
      },
    }
  );

  const onSubmit = (data) => {
    console.log(data);
    updateExpRelMutation.mutate(data);
  };

  // console.log(watch("expediente_tipo")); // watch input value by passing the name of it

  if (isLoading) return <Spin size="large" />;

  if (isError) return <p>Error</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Form.Item label="Notas">
        <Controller
          name="notas"
          control={control}
          label="Notas"
          render={({ field }) => (
            <TextArea
              {...field}
              rows={4}
              maxLength={255}
              placeholder="Agregue sus notas aqui"
            />
          )}
        />
      </Form.Item>
      <Form.Item label="Categoria">
        <Controller
          name="expediente_tipo"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              style={{
                width: "100%",
              }}
              placeholder="Sin etiquetas"
              options={
                tagsData
                  ? tagsData.data.data.map((tag) => ({
                      label: tag.attributes.nombre,
                      value: String(tag.id),
                    }))
                  : []
              }
            />
          )}
        />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        Enviar
      </Button>
    </form>
  );
}
