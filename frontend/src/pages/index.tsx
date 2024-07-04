import { MainLayout } from "../components/MainLayout";

export default function Index() {
  return <MainLayout>{null}</MainLayout>;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/seguimiento",
      permanent: false,
    },
  };
}
