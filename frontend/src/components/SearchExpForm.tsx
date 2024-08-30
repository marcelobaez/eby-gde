import React from "react";
import { InputNumber, Button, Flex, Typography, Tooltip } from "antd";
import { SearchOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useForm, Controller } from "react-hook-form";

const { Text } = Typography;

type SearchExpFormProps = {
  handleSubmit: (values: any) => void;
  handleReset: () => void;
  isSearching: boolean;
  layout?: "inline" | "vertical";
  justify?: "start" | "end" | "center";
  withTitle?: boolean;
  initialValues?: { year: number; number: number | null };
};

export type SearchExpFormValues = {
  year: number;
  number: number | null;
};

export const SearchExpForm = ({
  handleSubmit,
  handleReset,
  isSearching,
  layout = "inline",
  justify = "center",
  withTitle = true,
  initialValues,
}: SearchExpFormProps) => {
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

  const onFinish = async (values: SearchExpFormValues) => {
    handleSubmit(values);
  };

  const onReset = () => {
    reset();
    handleReset();
  };

  return (
    <form onSubmit={handleRHFSubmit(onFinish)}>
      <Flex gap="middle" justify={justify} align="center">
        {withTitle && <Text>Buscar expedientes</Text>}
        <label htmlFor="year">
          <span style={{ color: "red" }}>{`* `}</span>Año:
        </label>
        <Controller
          name="year"
          control={control}
          rules={{ required: "El año es obligatorio!" }}
          render={({ field }) => (
            <InputNumber
              {...field}
              status={errors.year ? "error" : ""}
              min={2018}
              max={2051}
            />
          )}
        />
        <label htmlFor="number">
          <span style={{ color: "red" }}>{`* `}</span>Número:
          {` `}
          <Tooltip title="No hacen falta los ceros delante">
            <InfoCircleOutlined style={{ color: "rgb(0,0,0,0.45)" }} />
          </Tooltip>
        </label>
        <Controller
          name="number"
          control={control}
          rules={{ required: "El número es obligatorio!" }}
          render={({ field }) => (
            <InputNumber
              status={errors.number ? "error" : ""}
              {...field}
              min={0}
            />
          )}
        />
        <Button htmlType="button" onClick={onReset}>
          Limpiar
        </Button>
        <Button
          type="primary"
          loading={isSearching}
          htmlType="submit"
          icon={<SearchOutlined />}
        >
          Buscar
        </Button>
      </Flex>
    </form>
  );
};
