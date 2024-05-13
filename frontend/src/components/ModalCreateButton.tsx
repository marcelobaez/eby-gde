import React, { useState } from "react";
import { Button, Modal, Form, Input, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../lib/axios";

const CollectionCreateForm = ({
  visible,
  onCreate,
  onCancel,
}: {
  visible: boolean;
  onCreate: (values: { titulo: string }) => void;
  onCancel: () => void;
}) => {
  const [form] = Form.useForm();
  return (
    <Modal
      open={visible}
      title="Crear nueva lista"
      okText="Crear"
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
      <Form form={form} layout="vertical" name="form_in_modal">
        <Form.Item
          name="titulo"
          label="Nombre"
          rules={[
            {
              required: true,
              message: "El nombre es obligatorio!",
            },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const ModalCreateButton = () => {
  const [visible, setVisible] = useState(false);
  const queryClient = useQueryClient();

  const addListMutation = useMutation({
    mutationFn: async (body: { titulo: string }) =>
      await api.post("/listas", { data: { titulo: body.titulo } }),
    onError: (err, variables, previousValue) => {
      message.error("No fue posible crear la lista");
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["listas"] });
      message.success("Lista creada!");
    },
  });

  const onCreate = (values: { titulo: string }) => {
    addListMutation.mutate({ titulo: values.titulo });
    setVisible(false);
  };

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        size="large"
        onClick={() => {
          setVisible(true);
        }}
      >
        Crear lista
      </Button>
      <CollectionCreateForm
        visible={visible}
        onCreate={onCreate}
        onCancel={() => {
          setVisible(false);
        }}
      />
    </>
  );
};
