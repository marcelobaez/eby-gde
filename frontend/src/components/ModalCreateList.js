import React, { useState } from "react";
import { Button, Modal, Form, Input, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQueryClient, useMutation } from "react-query";
import axios from "axios";
import { api } from "../lib/axios";

const CollectionCreateForm = ({ visible, onCreate, onCancel }) => {
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

export const ModalCreateList = () => {
  const [visible, setVisible] = useState(false);
  const queryClient = useQueryClient();

  const addListMutation = useMutation(
    (body) => api.post("/listas", { data: { titulo: body.titulo } }),
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries("listas");

        const previousValue = queryClient.getQueryData("listas");

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData("listas", previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Lista creada!");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("listas");
      },
    }
  );

  const onCreate = (values) => {
    addListMutation.mutate({ titulo: values.titulo });
    setVisible(false);
  };

  return (
    <div>
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
    </div>
  );
};
