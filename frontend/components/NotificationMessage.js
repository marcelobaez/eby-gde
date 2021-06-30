import { Result, Button } from "antd";

export function NotificationMessage() {
  return (
    <Result
      status="success"
      title="Expediente agregado correctamente"
      extra={[
        <Button type="primary" key="console">
          Ir a la lista
        </Button>,
        <Button key="buy">Agregar otro</Button>,
      ]}
    />
  );
}
