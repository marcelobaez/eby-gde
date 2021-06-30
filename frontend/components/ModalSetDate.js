import React, { useEffect, useState } from "react";
import { Button, Modal, Form, Input, Radio, Select, InputNumber } from "antd";

const { Option } = Select;

export function ModalSetDate({ visible, onCreate, onCancel, value }) {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({ days: value });
  }, [value]);

  return (
    <Modal
      visible={visible}
      title="Establecer tiempo de duración del trámite"
      okText="Establecer"
      cancelText="Cancelar"
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            form.resetFields();
            onCreate(values);
          })
          .catch((info) => {
            console.log("Validate Failed:", info);
          });
      }}
    >
      <Form form={form} layout="inline" name="form_in_modal">
        <Form.Item
          name="days"
          label="Dias"
          rules={[
            {
              required: true,
              message: "Debe ingresar un valor",
            },
          ]}
        >
          <InputNumber min={0} max={365} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
