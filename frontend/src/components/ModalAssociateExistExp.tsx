import { Modal, message, Tabs } from "antd";
import axios from "axios";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { NonExpAssociateForm } from "./NonExpAssociateForm";
import { SearchAssociateExpForm } from "./SearchAssociateExpForm";
import { TreeNode } from "@/utils";
import { ExpSearchResponse } from "@/types/apiGde";
import { FormValues } from "./ExpRelacionForm";

export function ModalAssociateExistExp({
  targetExp,
  existingIds,
}: {
  targetExp: TreeNode;
  existingIds: string[];
}) {
  const queryClient = useQueryClient();
  const [searchData, setSearchData] = useState<ExpSearchResponse>();
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

    setSearchData(expedientes[0]);
    setShowEmpty(!hasResults);
  };

  const handleReset = () => {
    setSearchData(undefined);
    setShowEmpty(false);
  };

  const addExpMutation = useMutation({
    mutationFn: (body: { id: number; searchData: ExpSearchResponse }) => {
      const { id, searchData } = body;
      return api.put(`/expedientes-relaciones/updaterel/${id}`, {
        data: {
          child: {
            expId: searchData.ID,
            expCode: searchData.CODIGO,
            descripcion: searchData.DESCRIPCION.substring(0, 255),
            fechaCreacion: searchData.FECHA_CREACION,
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
      queryClient.invalidateQueries({
        queryKey: ["arbolExpcode"],
      });
      message.success("Asociacion creada correctamente");
      handleReset();
    },
    onSettled: () => {
      Modal.destroyAll();
    },
  });

  const addCustomExpChildMutation = useMutation({
    mutationFn: (body: FormValues) => {
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
          },
        }
      );
    },
    onError: () => {
      message.error("Error al actualizar la relacion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["arbolExp"],
      });
      queryClient.invalidateQueries({
        queryKey: ["arbolExpcode"],
      });
      message.success("Relacion actualizada");
    },
    onSettled: () => {
      Modal.destroyAll();
    },
  });

  const onSubmit = (data: FormValues) => {
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
          handleAssociate={() => {
            if (searchData)
              addExpMutation.mutate({ searchData, id: targetExp.expId });
          }}
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
