import { DeleteOutlined, CalendarOutlined } from "@ant-design/icons";
import {
  Table,
  Typography,
  Button,
  Tooltip,
  Tag,
  Badge,
  Space,
  Popconfirm,
  message,
} from "antd";
import { parseISO, format } from "date-fns";
import esLocale from "date-fns/locale/es";
import { ModalSetDate } from "./ModalSetDate";
import { useQueryClient, useMutation } from "react-query";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const { Text } = Typography;

export function TableMov({ data }) {
  const [visible, setVisible] = useState(false);
  const queryClient = useQueryClient();
  const [selectedID, setSelectedID] = useState(null);
  const [value, setValue] = useState(0);

  const onCreate = (values) => {
    updateExpMutation.mutate({
      id: selectedID,
      duracion_esperada: values.days,
    });
    setVisible(false);
  };

  const onCancel = () => {
    setVisible(false);
  };

  const removeExpMutation = useMutation(
    (id) => axios.delete(`/api/expedientes/${id}`),
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
        message.success("Quitado de la lista");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("listas");
      },
    }
  );

  const updateExpMutation = useMutation(
    (body) => {
      const { id, duracion_esperada } = body;
      return axios.put(`/api/expedientes/${id}`, {
        duracion_esperada,
      });
    },
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
        message.success("Actualizado");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("listas");
      },
    }
  );

  const columns = [
    {
      title: "Expediente",
      dataIndex: "EXPEDIENTE",
      key: "EXPEDIENTE",
      width: 220,
      render: (text, record) => (
        <Link href={`/movimientos/${record.ID}`}>
          <a>{text}</a>
        </Link>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "DESCRIPCION",
      key: "DESCRIPCION",
      width: 320,
      ellipsis: true,
    },
    {
      title: "Tiempo de vida",
      dataIndex: "FECHA_CREACION",
      key: "Lifetime",
      width: 160,
      render: (text, record) => {
        return record.daysOverdue ? (
        <Badge count={record.daysOverdue} size="small">
          <Tag
            color={record.lifetimeColor}
            style={{ textTransform: "capitalize" }}
          >
            {record.lifetime}
          </Tag>
        </Badge>
      ) : (
        <Tag
          color={record.lifetimeColor}
          style={{ textTransform: "capitalize" }}
        >
          {record.lifetime}
        </Tag>
      )},
    },
    {
      title: "Estado",
      key: "ESTADO",
      dataIndex: "ESTADO",
      width: 150,
      render: (text, record) => (
        <span>
          <Badge status={record.stateColor} />
          {text}
        </span>
      ),
    },
    {
      title: "Creado",
      dataIndex: "FECHA_CREACION",
      key: "FECHA_CREACION",
      width: 100,
      render: (text) => (
        <Text>
          {format(parseISO(text), "P", {
            locale: esLocale,
          })}
        </Text>
      ),
    },
    {
      title: "Ultimo pase",
      dataIndex: "FECHA_OPERACION",
      key: "FECHA_OPERACION",
      width: 100,
      render: (text) => (
        <Text>
          {format(parseISO(text), "P", {
            locale: esLocale,
          })}
        </Text>
      ),
    },
    {
      title: "En poder",
      dataIndex: "DESTINATARIO",
      key: "DESTINATARIO",
      width: 300,
      render: (text, record) => (
        <Text>{`${text}${record.descripcion_reparticion_destin ? ` (${record.descripcion_reparticion_destin})}` : ''}`}</Text>
      ),
    },
    {
      title: "Acciones",
      key: "action",
      fixed: "right",
      width: 80,
      render: (text, record) => (
        <Space>
          <Tooltip title="Establecer tiempo de trámite">
            <Button
              size="small"
              icon={
                <CalendarOutlined
                  onClick={() => {
                    setSelectedID(record.id_exp_list);
                    setValue(record.duracion_esperada);
                    setVisible(true);
                  }}
                />
              }
            ></Button>
          </Tooltip>
          {data.length >= 1 ? (
            <Popconfirm
              title="Desea quitar el elemento?"
              onConfirm={() => removeExpMutation.mutate(record.id_exp_list)}
              okText="Quitar"
              okType="danger"
            >
              <Button
                ghost
                danger
                size="small"
                icon={<DeleteOutlined />}
              ></Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        rowKey="ID"
        dataSource={data}
        size="small"
        scroll={{ x: 1300 }}
      />
      <ModalSetDate
        visible={visible}
        onCancel={onCancel}
        onCreate={onCreate}
        value={value}
      />
    </>
  );
}
