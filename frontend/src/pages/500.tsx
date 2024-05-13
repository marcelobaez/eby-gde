import { Result, Button } from "antd";
import { useRouter } from "next/router";

export default function Custom500() {
  const router = useRouter();

  return (
    <Result
      status="500"
      title="500"
      subTitle="Disculpe, ocurrio un error en el servidor"
      extra={
        <Button onClick={() => router.push("/")} type="primary">
          Volver al inicio
        </Button>
      }
    />
  );
}
