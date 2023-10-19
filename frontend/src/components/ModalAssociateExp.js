import {
  ApartmentOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
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
  Result,
  message,
} from "antd";
import axios from "axios";
import { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { SearchExpForm } from "./SearchExpForm";
import { api } from "../lib/axios";

const { info } = Modal;

export function ModalAssociateExp({ targetExp }) {
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
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
    (asFather) => {
      return api.post("/expedientes-relaciones", {
        data: asFather
          ? {
              parent: {
                expId: searchData[0].ID,
                expCode: searchData[0].CODIGO,
                descripcion: searchData[0].DESCRIPCION.substring(0, 255),
              },
              child: {
                expId: targetExp.ID,
                expCode: targetExp.CODIGO,
                descripcion: targetExp.DESCRIPCION.substring(0, 255),
              },
            }
          : {
              parent: {
                expId: targetExp.ID,
                expCode: targetExp.CODIGO,
                descripcion: targetExp.DESCRIPCION.substring(0, 255),
              },
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
        await queryClient.cancelQueries(["arbolExp", targetExp.ID]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", targetExp.ID], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
        handleResetChild();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", targetExp.ID]);
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
            icon={<ArrowUpOutlined />}
            onClick={() => addExpMutation.mutate(true)}
          >
            Asociar como Padre
          </Button>
          <Button
            icon={<ArrowDownOutlined />}
            onClick={() => addExpMutation.mutate(false)}
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
        String(searchData[0].ID) !== String(targetExp.ID) && (
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
        String(searchData[0].ID) === String(targetExp.ID) && (
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
