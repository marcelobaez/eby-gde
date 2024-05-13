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
    mutationFn: () => {
      return api.put(`/expedientes-relaciones/updaterel/${targetExp.expId}`, {
        data: {
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
