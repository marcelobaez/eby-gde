import { MainLayout } from "@/components/MainLayout";
import { Result } from "antd";

export default function Custom404() {
  return (
    <MainLayout>
      <Result
        status="404"
        title="404"
        subTitle="Disculpe, la pagina que busca no existe"
      />
    </MainLayout>
  );
}
