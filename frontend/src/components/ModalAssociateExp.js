import { Modal, message, Tabs } from "antd";
import axios from "axios";
import { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { api } from "../lib/axios";
import { SearchAssociateExpForm } from "./SearchAssociateExpForm";
import { NonExpAssociateForm } from "./NonExpAssociateForm";

export function ModalAssociateExp({ targetExp }) {
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
    (asFather) => {
      return api.post("/expedientes-relaciones", {
        data: asFather
          ? {
              parent: {
                expId: searchData[0].ID,
                expCode: searchData[0].CODIGO,
                descripcion: searchData[0].DESCRIPCION.substring(0, 255),
                fechaCreacion: searchData[0].FECHA_CREACION,
                isExp: true,
              },
              child: {
                expId: targetExp.ID,
                expCode: targetExp.CODIGO,
                descripcion: targetExp.DESCRIPCION.substring(0, 255),
                fechaCreacion: targetExp.FECHA_CREACION,
                isExp: true,
              },
            }
          : {
              parent: {
                expId: targetExp.ID,
                expCode: targetExp.CODIGO,
                descripcion: targetExp.DESCRIPCION.substring(0, 255),
                fechaCreacion: targetExp.FECHA_CREACION,
                isExp: true,
              },
              child: {
                expId: searchData[0].ID,
                expCode: searchData[0].CODIGO,
                descripcion: searchData[0].DESCRIPCION.substring(0, 255),
                fechaCreacion: searchData[0].FECHA_CREACION,
                isExp: true,
              },
            },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp", targetExp.ID]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", targetExp.ID], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Asociacion creada correctamente");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", targetExp.ID]);
        Modal.destroyAll();
      },
    }
  );

  const addCustomExpFatherMutation = useMutation(
    (body) => {
      const { title, notas } = body;
      return api.post(`/expedientes-relaciones`, {
        data: {
          parent: {
            title,
            notas,
            isExp: false,
          },
          child: {
            expId: targetExp.ID,
            expCode: targetExp.CODIGO,
            descripcion: targetExp.DESCRIPCION.substring(0, 255),
            fechaCreacion: targetExp.FECHA_CREACION,
            isExp: true,
          },
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp", targetExp.ID]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", targetExp.ID], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Relacion actualizada");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", targetExp.ID]);
        Modal.destroyAll();
      },
    }
  );

  const addCustomExpChildMutation = useMutation(
    (body) => {
      const { title, notas } = body;
      return api.post(`/expedientes-relaciones/createcustom`, {
        data: {
          child: {
            title,
            notas,
            isExp: false,
          },
          parent: {
            expId: targetExp.ID,
            expCode: targetExp.CODIGO,
            descripcion: targetExp.DESCRIPCION.substring(0, 255),
            fechaCreacion: targetExp.FECHA_CREACION,
            isExp: true,
          },
        },
      });
    },
    {
      // Optimistically update the cache value on mutate, but store
      // the old value and return it so that it's accessible in case of
      // an error
      onMutate: async (text) => {
        await queryClient.cancelQueries(["arbolExp", targetExp.ID]);

        const previousValue = queryClient.getQueryData([
          "arbolExp",
          targetExp.ID,
        ]);

        return previousValue;
      },
      // On failure, roll back to the previous value
      onError: (err, variables, previousValue) => {
        message.error(err.response.data);
        queryClient.setQueryData(["arbolExp", targetExp.ID], previousValue);
      },
      onSuccess: (data, variables, context) => {
        message.success("Relacion actualizada");
      },
      // After success or failure, refetch the todos query
      onSettled: () => {
        queryClient.invalidateQueries(["arbolExp", targetExp.ID]);
        Modal.destroyAll();
      },
    }
  );

  const onSubmit = (data) => {
    if (data.asFather) {
      addCustomExpFatherMutation.mutate(data);
    } else {
      addCustomExpChildMutation.mutate(data);
    }
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
          existingIds={[targetExp.ID]}
          showEmpty={showEmpty}
          searchData={searchData}
          handleAssociate={(asFather) => addExpMutation.mutate(asFather)}
          allowFather={true}
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
