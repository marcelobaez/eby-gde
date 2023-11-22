import { Modal, message, Tabs } from "antd";
import axios from "axios";
import { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { api } from "../lib/axios";
import { NonExpAssociateForm } from "./NonExpAssociateForm";
import { SearchAssociateExpForm } from "./SearchAssociateexpForm";

export function ModalAssociateExistExp({ targetExp, existingIds }) {
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleSearch = async (values) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    queryClient.invalidateQueries("expedientes");

    setIsSearching(false);

    const hasResults = expedientes.length > 0;

    setSearchData(expedientes);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
  };

  const addExpMutation = useMutation(
    () => {
      return api.put(`/expedientes-relaciones/updaterel/${targetExp.expId}`, {
        data: {
          child: {
            expId: searchData[0].ID,
            expCode: searchData[0].CODIGO,
            descripcion: searchData[0].DESCRIPCION.substring(0, 255),
            fechaCreacion: searchData[0].FECHA_CREACION,
            isExp: true,
          },
          existingChild: targetExp.children
            ? targetExp.children.map((child) => child.expId)
            : [],
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp"]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.key,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp"], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
        handleReset();
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp"]);
        Modal.destroyAll();
      },
    }
  );

  const addCustomExpChildMutation = useMutation(
    (body) => {
      const { title, notas, expediente_tipo } = body;
      return api.put(
        `/expedientes-relaciones/updaterelcustom/${targetExp.expId}`,
        {
          data: {
            child: {
              title,
              notas,
              expediente_tipo,
              isExp: false,
            },
            existingChild: targetExp.children
              ? targetExp.children.map((child) => child.expId)
              : [],
          },
        }
      );
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp"]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.key,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", targetExp.key], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Relacion actualizada");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp"]);
        Modal.destroyAll();
      },
    }
  );

  const onSubmit = (data) => {
    addCustomExpChildMutation.mutate(data);
  };

  const tabs = [
    {
      key: "1",
      label: "Expediente",
      children: (
        <SearchAssociateExpForm
          handleSearch={handleSearch}
          handleReset={handleReset}
          isSearching={isSearching}
          existingIds={existingIds}
          showEmpty={showEmpty}
          searchData={searchData}
          handleAssociate={() => addExpMutation.mutate()}
        />
      ),
    },
    {
      key: "2",
      label: "Sin expediente",
      children: <NonExpAssociateForm onSubmit={onSubmit} />,
    },
  ];

  return <Tabs defaultActiveKey="1" items={tabs} />;
}
