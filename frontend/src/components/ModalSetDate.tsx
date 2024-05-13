import React, { useEffect } from "react";
import { Modal, Form, InputNumber } from "antd";

export function ModalSetDate({
  visible,
  onCreate,
  onCancel,
  value,
}: {
  visible: boolean;
  onCreate: (values: { days: number }) => void;
  onCancel: () => void;
  value: number | null;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({ days: value });
  }, [value]);

  return (
    <Modal
      open={visible}
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
