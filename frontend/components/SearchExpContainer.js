import { Row, Col, Empty, message, Card, Statistic, PageHeader } from "antd";
import { SearchExpForm } from "./SearchExpForm";
import { TableResults } from "./TableResults";
import { TableMov } from "./TableMov";
import { EmptyItems } from "./EmptyItems";
import { useState } from "react";
import { useQueryClient, useMutation } from "react-query";
import { getCountDelayed, getCountOnTime } from "../utils/index";
import axios from "axios";

const queryKey = 'expedientes';

export function SearchExpContainer({ data }) {
  const movs = data.expedientes;
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const addExpMutation = useMutation(
    (id) => {
      return axios.post("/api/expedientes", { id_expediente: id, lista: data.id })
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(queryKey);

        const previousValue = queryClient.getQueryData(queryKey);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(queryKey, previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Agregado a la lista");
        handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(queryKey);
      },
    }
  );

  const handleSubmit = async (values) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    queryClient.invalidateQueries(queryKey);

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
      <Col key='list-header' span={24}>
        <PageHeader
          onBack={() => window.history.back()}
          title="Listas de seguimiento"
          subTitle={data.titulo}
        />
      </Col>
      <Col span={24}>
        <Card
          bordered={false}
          style={{ width: "100%", minHeight: "300px" }}
        >
          <Row gutter={[16, 16]}>
            {data.expedientes.length > 0 && (
              <>
                <Col span={6}>
                  <Statistic
                    title="Siguiendo"
                    value={data.expedientes.length}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="En término"
                    valueStyle={{color: '#389e0d'}}
                    value={getCountOnTime(data.expedientes)}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Fuera de término"
                    valueStyle={{color: '#cf1322'}}
                    value={getCountDelayed(data.expedientes)}
                  />
                </Col>
              </>
            )}
            {movs.length > 0 && (
              <Col span={24}>
                <TableMov data={movs} />
              </Col>
            )}
            {!movs.length && (
              <Col offset={8} span={8}>
                <EmptyItems />  
              </Col>
            )}
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
