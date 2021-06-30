import { Row, Col, Empty, message, Card, Statistic } from "antd";
import { SearchExpForm } from "./SearchExpForm";
import { TableResults } from "./TableResults";
import { TableMov } from "./TableMov";
import { EmptyItems } from "./EmptyItems";
import { useState } from "react";
import { useQueryClient, useMutation } from "react-query";
import { getCountByState } from "../utils/index";
import axios from "axios";

export function SearchExpContainer({ data }) {
  const movs = data[0].expedientes;
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const addExpMutation = useMutation(
    (id) =>
      axios.post("/api/expedientes", { id_expediente: id, lista: data[0].id }),
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
        message.success("Agregado a la lista");
        handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries("listas");
      },
    }
  );

  const handleSubmit = async (values) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    queryClient.invalidateQueries("listas");

    setIsSearching(false);

    const hasResults = expedientes.length;

    setSearchData(expedientes);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
  };

  const handleAdd = async (id) => {
    addExpMutation.mutate(id);
  };

  return (
    <Row gutter={[16, 16]} justify="center">
      <Col span={24}>
        <Card
          title={data[0].titulo}
          bordered={false}
          style={{ width: "100%", minHeight: "300px" }}
        >
          <Row gutter={[16, 16]} justify="center">
            {data[0].expedientes.length > 0 && (
              <>
                <Col span={6}>
                  <Statistic
                    title="Siguiendo"
                    value={data[0].expedientes.length}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Iniciacion"
                    value={getCountByState(data[0].expedientes, "Iniciacion")}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="En trámite"
                    value={getCountByState(data[0].expedientes, "Tramitación")}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Guarda temporal"
                    value={getCountByState(
                      data[0].expedientes,
                      "Guarda Temporal"
                    )}
                  />
                </Col>
              </>
            )}
            {movs.length > 0 && (
              <Col span={24}>
                <TableMov data={movs} />
              </Col>
            )}
            {!movs.length && <EmptyItems />}
          </Row>
        </Card>
      </Col>
      <Col span={24}>
        <Card bordered={false} style={{ width: "100%" }}>
          {showSearch && (
            <SearchExpForm
              handleSubmit={handleSubmit}
              handleReset={handleReset}
              isSearching={isSearching}
            />
          )}
        </Card>
      </Col>
      {searchData.length > 0 && (
        <Col span={24}>
          <Card bordered={false} style={{ width: "100%" }}>
            <TableResults
              data={searchData}
              handleAdd={handleAdd}
              isAdding={addExpMutation.isLoading}
            />
          </Card>
        </Col>
      )}
      {showEmpty && (
        <Col span={24}>
          <Card bordered={false} style={{ width: "100%" }}>
            <Empty description="No se encontraron resultados. Verifique los valores ingresados" />
          </Card>
        </Col>
      )}
    </Row>
  );
}
