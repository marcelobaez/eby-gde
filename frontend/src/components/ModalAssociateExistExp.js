import {
  ApartmentOutlined,
  ArrowDownOutlined,
  FolderOutlined,
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
  message,
  Result,
} from "antd";
import axios from "axios";
import { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { SearchExpForm } from "./SearchExpForm";
import { api } from "../lib/axios";

const { info } = Modal;

export function ModalAssociateExistExp({ targetExp, existingIds }) {
  // console.log({ targetExp });
  // console.log(existingIds);
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
  console.log(searchData);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleSubmit = async (values) => {
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

  const addExpMutation = useMutation(
    () => {
      return api.put(`/expedientes-relaciones/updaterel/${targetExp.expId}`, {
        data: {
          child: {
            expId: searchData[0].ID,
            expCode: searchData[0].CODIGO,
            descripcion: searchData[0].DESCRIPCION.substring(0, 255),
          },
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp", targetExp.key]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.key,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", targetExp.key], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
        handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", targetExp.key]);
        Modal.destroyAll();
      },
    }
  );

  const showConfirm = () => {
    info({
      title: "Indique el tipo de asociación que desea realizar",
      content: (
        <Space>
          <Button
            icon={<ArrowDownOutlined />}
            onClick={() => addExpMutation.mutate()}
          >
            Asociar como Hijo
          </Button>
        </Space>
      ),
      centered: true,
      footer: null,
      closable: true,
      width: 500,
    });
  };

  return (
    <Space size="middle" direction="vertical" style={{ width: "100%" }}>
      <SearchExpForm
        // layout="vertical"
        withTitle={false}
        handleSubmit={handleSubmit}
        handleReset={handleReset}
        isSearching={isSearching}
      />
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
                    <Button icon={<ApartmentOutlined />} onClick={showConfirm}>
                      Asociar
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
            title="No se puede asociar un expediente que ya existe en el arbol"
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
