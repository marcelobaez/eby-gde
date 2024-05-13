import { Modal, message, Tabs } from "antd";
import axios from "axios";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { SearchAssociateExpForm } from "./SearchAssociateExpForm";
import { NonExpAssociateForm } from "./NonExpAssociateForm";
import { ExpSearchResponse } from "@/types/apiGde";
import { FormValues } from "./ExpRelacionForm";

export function ModalAssociateExp({
  targetExp,
}: {
  targetExp: ExpSearchResponse;
}) {
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState<ExpSearchResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleSearch = async (values: { year: number; number: number }) => {
    const { year, number } = values;

    setIsSearching(true);
    const { data: expedientes } = await axios.get(
      `/api/gdeexps/${year}/${number}`
    );

    setIsSearching(false);

    const hasResults = expedientes.length > 0;

    setSearchData(expedientes);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData([]);
    setShowEmpty(false);
  };

  const addExpMutation = useMutation({
    mutationFn: (asFather: boolean) => {
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
    onError: () => {
      message.error("Error al asociar expediente");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
      message.success("Asociacion creada correctamente");
    },
    onSettled: () => {
      Modal.destroyAll();
    },
  });

  const addCustomExpFatherMutation = useMutation({
    mutationFn: (body: FormValues) => {
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
    onError: () => {
      message.error("Error al actualizar la relacion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
      message.success("Relacion actualizada");
    },
    onSettled: () => {
      Modal.destroyAll();
    },
  });

  const addCustomExpChildMutation = useMutation({
    mutationFn: (body: FormValues) => {
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
    onError: () => {
      message.error("Error al actualizar la relacion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
      message.success("Relacion actualizada");
    },
    onSettled: () => {
      Modal.destroyAll();
    },
  });

  const onSubmit = (data: FormValues & { asFather: boolean }) => {
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
          existingIds={[targetExp.ID.toString()]}
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
