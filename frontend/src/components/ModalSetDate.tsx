import React from "react";
import { Modal, InputNumber, Flex } from "antd";
import { Controller, useForm } from "react-hook-form";

type FormValues = {
  days: number | null;
};

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
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    values: {
      days: value ?? null,
    },
  });

  const onFormSubmit = async (values: FormValues) => {
    if (values.days !== null) onCreate({ days: values.days });
  };

  return (
    <Modal
      open={visible}
      title="Establecer tiempo de duración del trámite"
      okText="Establecer"
      cancelText="Cancelar"
      onCancel={onCancel}
      onOk={handleSubmit(onFormSubmit)}
    >
      <form name="form_in_modal">
        <Flex gap="middle">
          <label htmlFor="days">
            <span style={{ color: "red" }}>{`* `}</span>Dias:
          </label>
          <Controller
            name="days"
            control={control}
            rules={{ required: "Debe ingresar un valor" }}
            render={({ field }) => (
              <InputNumber
                {...field}
                status={errors.days ? "error" : ""}
                min={0}
                max={365}
              />
            )}
          />
        </Flex>
      </form>
    </Modal>
  );
}
