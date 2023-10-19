import React, { useState, useEffect } from "react";
import { Form, InputNumber, Button, Row, Col } from "antd";
import { SearchOutlined, InfoCircleOutlined } from "@ant-design/icons";

export const SearchExpForm = ({
  handleSubmit,
  handleReset,
  isSearching,
  layout = "inline",
  justify = "center",
  withTitle = true,
}) => {
  const [form] = Form.useForm();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    forceUpdate({});
  }, []);

  const onFinish = async (values) => {
    handleSubmit(values);
  };

  const onReset = () => {
    form.resetFields();
    handleReset();
  };

  return (
    <Row justify={justify} gutter={16}>
      <Col>
        <Form
          layout={layout}
          onFinish={onFinish}
          form={form}
          initialValues={{
            year: new Date().getFullYear(),
          }}
          requiredMark={false}
        >
          {withTitle && <Form.Item label="Buscar expedientes" colon={false} />}
          <Form.Item
            name="year"
            label="Año"
            rules={[{ required: true, message: "El año es obligatorio!" }]}
          >
            <InputNumber min={2018} max={2051} />
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
            <InputNumber min={0} />
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
        </Form>
      </Col>
    </Row>
  );
};
