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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { PlusOutlined } from "@ant-design/icons";
import { ChangeEvent, useRef, useState } from "react";
import { CategoriaResponse } from "@/types/categoria";

const { TextArea } = Input;

export type FormValues = {
  notas: string;
  title: string;
  expediente_tipo: { value: number; label: string } | null;
};

export function ExpRelacionForm({
  id,
  handleSuccess,
}: {
  id: number;
  handleSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  // Obtener las etiquetas de la base de datos
  const { data: tagsData } = useQuery({
    queryKey: ["tags"],

    queryFn: async () =>
      await api.get<CategoriaResponse>(
        "/expedientes-tipos?pagination[pageSize]=1000&sort=nombre:asc"
      ),
  });
  const inputRef = useRef(null);
  const [name, setName] = useState("");

  // Obtener los datos de la relación
  const { data, isLoading, isError } = useGetExpRelationById(id);

  const { handleSubmit, control } = useForm<FormValues>({
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

  const updateExpRelMutation = useMutation({
    mutationFn: (body: FormValues) => {
      const { expediente_tipo, notas, title } = body;
      return api.put(`/expedientes-relaciones/${id}`, {
        data: { notas, expediente_tipo, title },
      });
    },
    onError: () => {
      message.error("Error al actualizar la relacion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arbolExp"] });
      message.success("Relacion actualizada");
      handleSuccess();
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: (body: { name: string }) => {
      return api.post(`/expedientes-tipos`, {
        data: { nombre: name },
      });
    },
    onError: () => {
      message.error("Error al actualizar la etiqueta");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tags"],
      });
      setName("");
    },
  });

  const onSubmit = (data: FormValues) => {
    updateExpRelMutation.mutate(data);
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

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
                      onClick={(e) => {
                        e.preventDefault();
                        if (name) {
                          updateTagMutation.mutate({ name });
                        }
                      }}
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
