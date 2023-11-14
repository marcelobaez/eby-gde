import {
  Input,
  Select,
  Spin,
  Form,
  Button,
  message,
  Divider,
  Space,
} from "antd";
import { Controller, useForm } from "react-hook-form";
import { useGetExpRelationById } from "../hooks/useArbolExp";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { api } from "../lib/axios";
import { PlusOutlined } from "@ant-design/icons";
import { useRef, useState } from "react";

const { TextArea } = Input;

export function ExpRelacionForm({ id, handleSuccess }) {
  const queryClient = useQueryClient();
  // Obtener las etiquetas de la base de datos
  const { data: tagsData } = useQuery(
    "tags",
    async () => await api.get("/expedientes-tipos")
  );
  const inputRef = useRef(null);
  const [name, setName] = useState("");
  // console.log(tagsData);

  // Obtener los datos de la relación
  const { data, isLoading, isError } = useGetExpRelationById(id);

  const {
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm({
    values: {
      title: data ? data.attributes.title : "",
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
  });

  const updateExpRelMutation = useMutation(
    (body) => {
      const { expediente_tipo, notas, title } = body;
      return api.put(`/expedientes-relaciones/${id}`, {
        data: { notas, expediente_tipo, title },
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
      onSuccess: (data, variables, context) => {
        message.success("Relacion actualizada");
        handleSuccess();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["expRelDetails", id]);
        queryClient.invalidateQueries("arbolExp");
      },
    }
  );

  const updateTagMutation = useMutation(
    () => {
      return api.post(`/expedientes-tipos`, {
        data: { nombre: name },
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
        setName("");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["tags"]);
      },
    }
  );

  const onSubmit = (data) => {
    updateExpRelMutation.mutate(data);
  };

  const onNameChange = (event) => {
    setName(event.target.value);
  };

  const addItem = (e) => {
    e.preventDefault();
    if (name) {
      updateTagMutation.mutate();
    }
  };

  // console.log(watch("expediente_tipo")); // watch input value by passing the name of it

  if (isLoading) return <Spin size="large" />;

  if (isError) return <p>Error</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {data && !data.attributes.isExp && (
        <Form.Item
          label="Titulo"
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Indique el titulo de la asociacion"
              />
            )}
          />
        </Form.Item>
      )}
      <Form.Item
        label="Notas"
        labelCol={{ span: 24 }}
        wrapperCol={{ span: 24 }}
      >
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
      <Form.Item
        label="Categoria"
        labelCol={{ span: 24 }}
        wrapperCol={{ span: 24 }}
      >
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
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider
                    style={{
                      margin: "8px 0",
                    }}
                  />
                  <Space
                    style={{
                      padding: "0 8px 4px",
                    }}
                  >
                    <Input
                      placeholder="Ingrese el nombre"
                      ref={inputRef}
                      value={name}
                      onChange={onNameChange}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={addItem}
                    >
                      Agregar item
                    </Button>
                  </Space>
                </>
              )}
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
