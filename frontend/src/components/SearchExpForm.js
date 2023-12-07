import React from "react";
import { Form, InputNumber, Button, Row, Col, Flex } from "antd";
import { SearchOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useForm, Controller } from "react-hook-form";

export const SearchExpForm = ({
  handleSubmit,
  handleReset,
  isSearching,
  layout = "inline",
  justify = "center",
  withTitle = true,
  initialValues,
}) => {
  const {
    handleSubmit: handleRHFSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    values: {
      year: initialValues?.year || new Date().getFullYear(),
      number: initialValues?.number || null,
    },
  });

  const onFinish = async (values) => {
    handleSubmit(values);
  };

  const onReset = () => {
    reset();
    handleReset();
  };

  return (
    <form onSubmit={handleRHFSubmit(onFinish)}>
      <Flex gap="middle" justify={justify}>
        {withTitle && <Form.Item label="Buscar expedientes" colon={false} />}
        <Form.Item
          name="year"
          label="Año"
          rules={[{ required: true, message: "El año es obligatorio!" }]}
        >
          <Controller
            name="year"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} min={2018} max={2051} />
            )}
          />
        </Form.Item>
        <Form.Item
          tooltip={{
            title: "No hacen falta los ceros delante",
            icon: <InfoCircleOutlined />,
          }}
          name="number"
          label="Número"
          rules={[{ required: true, message: "El número es obligatorio!" }]}
        >
          <Controller
            name="number"
            control={control}
            render={({ field }) => <InputNumber {...field} min={0} />}
          />
        </Form.Item>
        <Form.Item>
          <Button htmlType="button" onClick={onReset}>
            Limpiar
          </Button>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            loading={isSearching}
            htmlType="submit"
            icon={<SearchOutlined />}
          >
            Buscar
          </Button>
        </Form.Item>
      </Flex>
    </form>
  );
};
