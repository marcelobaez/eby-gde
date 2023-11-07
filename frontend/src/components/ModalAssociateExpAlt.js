import {
  ApartmentOutlined,
  FolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Col,
  List,
  Button,
  Modal,
  Card,
  Empty,
  Avatar,
  Space,
  Result,
  message,
  Divider,
  Flex,
  Form,
  Input,
  Radio,
  Select,
} from "antd";
import axios from "axios";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { SearchExpForm } from "./SearchExpForm";
import { api } from "../lib/axios";
import { Controller, useForm } from "react-hook-form";

const { TextArea } = Input;

export function ModalAssociateExpAlt({ targetExp, existingIds }) {
  // console.log({ targetExp });
  // console.log({ targetExp });
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const inputRef = useRef(null);
  const [name, setName] = useState("");

  const { data: tagsData } = useQuery(
    "tags",
    async () => await api.get("/expedientes-tipos")
  );

  const handleSearch = async (values) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    queryClient.invalidateQueries("expedientes");

    setIsSearching(false);

    const hasResults = expedientes.length > 0;

    setSearchData(expedientes);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
  };

  const addExpMutationCustom = useMutation(
    () => {
      return api.put(`/expedientes-relaciones/updaterel/${targetExp.expId}`, {
        data: {
          child: {
            expId: searchData[0].ID,
            expCode: searchData[0].CODIGO,
            descripcion: searchData[0].DESCRIPCION.substring(0, 255),
            fechaCreacion: searchData[0].FECHA_CREACION,
            isExp: true,
          },
          existingChild: targetExp.children
            ? targetExp.children.map((child) => child.expId)
            : [],
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp"]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp"], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
        handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp"]);
        Modal.destroyAll();
      },
    }
  );

  const addExpMutation = useMutation(
    () => {
      return api.post("/expedientes-relaciones", {
        data: {
          parent: {
            expId: searchData[0].ID,
            expCode: searchData[0].CODIGO,
            descripcion: searchData[0].DESCRIPCION.substring(0, 255),
            fechaCreacion: searchData[0].FECHA_CREACION,
            isExp: true,
          },
          child: {
            expId: targetExp.ID,
            expCode: targetExp.CODIGO,
            descripcion: targetExp.DESCRIPCION.substring(0, 255),
            fechaCreacion: targetExp.FECHA_CREACION,
            isExp: targetExp.IS_EXPEDIENTE,
          },
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp"]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp"], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp"]);
        Modal.destroyAll();
      },
    }
  );

  const addCustomExpFatherMutation = useMutation(
    (body) => {
      const { title, notas } = body;
      return api.post(`/expedientes-relaciones`, {
        data: {
          parent: {
            title,
            notas,
            isExp: false,
          },
          child: {
            expId: targetExp.ID,
            expCode: targetExp.CODIGO,
            descripcion: targetExp.DESCRIPCION.substring(0, 255),
            fechaCreacion: targetExp.FECHA_CREACION,
            isExp: targetExp.IS_EXPEDIENTE,
          },
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp"]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp"], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Relacion actualizada");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp"]);
        Modal.destroyAll();
      },
    }
  );

  const addCustomExpChildMutation = useMutation(
    (body) => {
      const { title, notas } = body;
      return api.post(`/expedientes-relaciones/createcustom`, {
        data: {
          child: {
            title,
            notas,
            isExp: false,
          },
          parent: {
            expId: targetExp.ID,
            expCode: targetExp.CODIGO,
            descripcion: targetExp.DESCRIPCION.substring(0, 255),
            fechaCreacion: targetExp.FECHA_CREACION,
            isExp: targetExp.IS_EXPEDIENTE,
          },
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp"]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp"], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Relacion actualizada");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp"]);
        Modal.destroyAll();
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
    if (data.asFather) {
      addCustomExpFatherMutation.mutate(data);
    } else {
      addCustomExpChildMutation.mutate(data);
    }
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

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      notas: "",
      asFather: true,
    },
  });

  return (
    <Space size="middle" direction="vertical" style={{ width: "100%" }}>
      <Divider plain>Asociar con expediente</Divider>
      <SearchExpForm
        // layout="vertical"
        withTitle={false}
        handleSubmit={handleSearch}
        handleReset={handleReset}
        isSearching={isSearching}
      />
      {searchData.length === 0 && (
        <>
          <Divider plain>Asociar sin expediente</Divider>
          <Flex justify="center" align="center">
            <form onSubmit={handleSubmit(onSubmit)} style={{ width: 350 }}>
              <Form.Item label="Titulo">
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
              <Form.Item label="Notas">
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
              <Form.Item label="Tipo de asociacion">
                <Controller
                  name="asFather"
                  control={control}
                  render={({ field }) => (
                    <Radio.Group {...field}>
                      <Radio value={true}>Padre</Radio>
                      <Radio value={false}>Hijo</Radio>
                    </Radio.Group>
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
                Asociar
              </Button>
            </form>
          </Flex>
        </>
      )}
      {/* Mostrar resultados de busqueda */}
      {searchData.length > 0 &&
        !existingIds.includes(String(searchData[0].ID)) && (
          <Col span={24}>
            <List
              itemLayout="horizontal"
              size="large"
              dataSource={[
                {
                  code: searchData[0].CODIGO,
                  description: searchData[0].DESCRIPCION,
                },
              ]}
              loading={isSearching}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button
                      icon={<ApartmentOutlined />}
                      onClick={() => addExpMutation.mutate()}
                    >
                      Asociar como Padre
                    </Button>,
                    <Button
                      icon={<ApartmentOutlined />}
                      onClick={() => addExpMutationCustom.mutate()}
                    >
                      Asociar como Hijo
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<FolderOutlined />} />}
                    title={item.code}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </Col>
        )}
      {/* Mostrar mensaje de error si se intenta asociar a si mismo */}
      {searchData.length > 0 &&
        existingIds.includes(String(searchData[0].ID)) && (
          <Result
            status="error"
            title="No se puede asociar un expediente a si mismo"
          />
        )}
      {showEmpty && (
        <Col span={24}>
          <Card bordered={false} style={{ width: "100%" }}>
            <Empty description="No se encontro el expediente solicitado. Verifique los datos ingresados" />
          </Card>
        </Col>
      )}
    </Space>
  );
}
