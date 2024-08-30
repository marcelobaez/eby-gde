import { Result } from "antd";

export default function Custom500() {
  return (
    <Result
      status="500"
      title="500"
      subTitle="Disculpe, ocurrio un error al procesar su pedido"
    />
  );
}
