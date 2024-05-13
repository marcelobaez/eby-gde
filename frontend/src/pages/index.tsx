import { MainLayout } from "../components/MainLayout";
import { Alert, Skeleton } from "antd";

export default function Index() {
  if (status === "loading") {
    return (
      <MainLayout>
        <Skeleton active />
      </MainLayout>
    );
  }

  if (status === "error") {
    return (
      <MainLayout>
        <Alert
          message="Error"
          description="No fue posible realizar la operacion."
          type="error"
          showIcon
        />
      </MainLayout>
    );
  }

  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/seguimiento",
      permanent: false,
    },
  };
}
