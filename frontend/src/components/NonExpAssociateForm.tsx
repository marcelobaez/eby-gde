import { useState, useRef, ChangeEvent } from "react";
import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Space,
  Divider,
  Flex,
  Input,
  Radio,
  Select,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { Controller, useForm } from "react-hook-form";
import { CategoriaResponse } from "@/types/categoria";

const { TextArea } = Input;
const { Text } = Typography;

export function NonExpAssociateForm({
  onSubmit,
  allowFather = false,
}: {
  onSubmit: any;
  allowFather?: boolean;
}) {
  const queryClient = useQueryClient();
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      notas: "",
      asFather: false,
      expediente_tipo: null,
    },
  });

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: async () =>
      await api.get<CategoriaResponse>(
        "/expedientes-tipos?pagination[pageSize]=1000&sort=nombre:asc"
      ),
  });

  const inputRef = useRef(null);
  const [name, setName] = useState("");

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const updateTagMutation = useMutation({
    mutationFn: () => {
      return api.post(`/expedientes-tipos`, {
        data: { nombre: name },
      });
    },
    onError: () => {
      message.error("Error al agregar la categoria");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tags"],
      });
      setName("");
    },
  });

  return (
    <Flex justify="center" style={{ width: "100%" }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: 400 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Flex gap="small">
            <label htmlFor="title">Titulo: </label>
            <div style={{ width: "100%" }}>
              <Controller
                name="title"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    status={errors.title ? "error" : ""}
                    placeholder="Indique el titulo de la asociacion"
                  />
                )}
              />
              {errors.title && (
                <Text type="danger">El titulo es obligatorio</Text>
              )}
            </div>
          </Flex>
          <Flex gap="small">
            <label htmlFor="title">Notas: </label>
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
          </Flex>
          <Flex gap="small">
            <label htmlFor="title">Tipo de Asociacion: </label>
            <Controller
              name="asFather"
              control={control}
              render={({ field }) => (
                <Radio.Group disabled={!allowFather} {...field}>
                  <Radio value={true}>Padre</Radio>
                  <Radio value={false}>Hijo</Radio>
                </Radio.Group>
              )}
            />
          </Flex>
          <Flex gap="small">
            <label htmlFor="title">Categoria: </label>
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
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? "").includes(input)
                  }
                  filterSort={(optionA, optionB) =>
                    (optionA?.label ?? "")
                      .toLowerCase()
                      .localeCompare((optionB?.label ?? "").toLowerCase())
                  }
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
                              updateTagMutation.mutate();
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
          </Flex>
          <Button type="primary" htmlType="submit">
            Asociar
          </Button>
        </Space>
      </form>
    </Flex>
  );
}
