import { MainLayout } from "../../components/MainLayout";
import { ListsContainer } from "../../components/ListsContainer";
import { authOptions } from "../api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

export default function SegByID() {
  return (
    <MainLayout>
      <ListsContainer />
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
