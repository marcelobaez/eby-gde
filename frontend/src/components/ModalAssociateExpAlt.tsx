import { Tabs } from "antd";
import axios from "axios";
import { useState } from "react";
import { SearchAssociateExpForm } from "./SearchAssociateExpForm";
import { NonExpAssociateForm } from "./NonExpAssociateForm";
import { TargetExpProps } from "./TreeTitleRenderer";
import { ExpSearchResponse } from "@/types/apiGde";
import { SearchDocExpForm } from "./SearchDocExpForm";
import { sedesCodes } from "@/utils";
import { useCreateExpMutation } from "./ModalAssociateExp.utils";

export function ModalAssociateExpAlt({
  targetExp,
  existingIds,
  onlyChild = false,
  isRoot,
  onSuccess,
}: {
  targetExp: TargetExpProps;
  existingIds: string[];
  onlyChild?: boolean;
  isRoot: boolean;
  onSuccess?: () => void;
}) {
  const [searchData, setSearchData] = useState<ExpSearchResponse>();
  const [isSearching, setIsSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const createExpRelMutation = useCreateExpMutation();

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

  const onSubmit = async (data: {
    title: string;
    notas: string;
    asFather: boolean;
    expediente_tipo: number | null;
  }) => {
    if (data.asFather) {
      createExpRelMutation.mutateAsync({
        parent: {
          notas: data.notas,
          title: data.title,
          expediente_tipo: data.expediente_tipo || undefined,
          isExp: false,
          isExpDoc: false,
        },
        child: {
          expId: targetExp.ID,
          expCode: targetExp.CODIGO,
          descripcion: targetExp.DESCRIPCION.substring(0, 255),
          isExp: true,
          isExpDoc: false,
        },
      });
      onSuccess && onSuccess();
    } else {
      createExpRelMutation.mutateAsync({
        parent: {
          expId: targetExp.ID,
          expCode: targetExp.CODIGO,
          descripcion: targetExp.DESCRIPCION.substring(0, 255),
          isExp: true,
          isExpDoc: false,
        },
        child: {
          notas: data.notas,
          title: data.title,
          expediente_tipo: data.expediente_tipo || undefined,
          isExp: false,
          isExpDoc: false,
        },
      });
      onSuccess && onSuccess();
    }
  };

  const tabs = [
    {
      key: "1",
      label: "Expediente GDE",
      children: (
        <SearchAssociateExpForm
          handleSearch={handleSearch}
          handleReset={handleReset}
          isSearching={isSearching}
          existingIds={existingIds}
          showEmpty={showEmpty}
          searchData={searchData}
          handleAssociate={async (asFather) => {
            if (searchData) {
              if (asFather) {
                await createExpRelMutation.mutateAsync({
                  parent: {
                    expId: searchData.ID,
                    expCode: searchData.CODIGO,
                    descripcion: searchData.DESCRIPCION.substring(0, 255),
                    fechaCreacion: searchData.FECHA_CREACION,
                    isExp: true,
                    isExpDoc: false,
                  },
                  child: {
                    expId: targetExp.ID,
                    expCode: targetExp.CODIGO,
                    descripcion: targetExp.DESCRIPCION.substring(0, 255),
                    isExp: targetExp.IS_EXPEDIENTE,
                    isExpDoc: targetExp.IS_EXPEDIENTEDOC,
                  },
                });
                onSuccess && onSuccess();
              } else {
                await createExpRelMutation.mutateAsync({
                  parent: {
                    expId: targetExp.ID,
                    expCode: targetExp.CODIGO,
                    descripcion: targetExp.DESCRIPCION.substring(0, 255),
                    isExp: targetExp.IS_EXPEDIENTE,
                    isExpDoc: targetExp.IS_EXPEDIENTEDOC,
                  },
                  child: {
                    expId: searchData.ID,
                    expCode: searchData.CODIGO,
                    descripcion: searchData.DESCRIPCION.substring(0, 255),
                    fechaCreacion: searchData.FECHA_CREACION,
                    isExp: true,
                    isExpDoc: false,
                  },
                });
                onSuccess && onSuccess();
              }
            }
          }}
          allowFather={!onlyChild && isRoot}
        />
      ),
    },
    {
      key: "2",
      label: "Expediente Fisico",
      children: (
        <SearchDocExpForm
          handleSubmit={(values) => {}}
          mode="associate"
          targetExpCode={targetExp.CODIGO}
          existingIds={existingIds}
          allowFather={!onlyChild && isRoot}
          onAssociate={async (asFather, selectedExp) => {
            const selectedCode = `${
              sedesCodes[selectedExp.attributes.SEDE as keyof typeof sedesCodes]
            }-${selectedExp.attributes.NRO_ORDEN}-${
              selectedExp.attributes.NRO_EXPE
            }-${selectedExp.attributes.SEDE}`;
            if (asFather) {
              await createExpRelMutation.mutateAsync({
                parent: {
                  expCode: selectedCode,
                  descripcion: selectedExp.attributes.ASUNTO.substring(0, 255),
                  fechaCreacion: new Date().toISOString(),
                  isExp: false,
                  isExpDoc: true,
                },
                child: {
                  expId: targetExp.ID,
                  expCode: targetExp.CODIGO,
                  descripcion: targetExp.DESCRIPCION.substring(0, 255),
                  isExp: targetExp.IS_EXPEDIENTE,
                  isExpDoc: targetExp.IS_EXPEDIENTEDOC,
                },
              });
              onSuccess && onSuccess();
            } else {
              await createExpRelMutation.mutateAsync({
                parent: {
                  expId: targetExp.ID,
                  expCode: targetExp.CODIGO,
                  descripcion: targetExp.DESCRIPCION.substring(0, 255),
                  isExp: targetExp.IS_EXPEDIENTE,
                  isExpDoc: targetExp.IS_EXPEDIENTEDOC,
                },
                child: {
                  expCode: selectedCode,
                  descripcion: selectedExp.attributes.ASUNTO.substring(0, 255),
                  fechaCreacion: new Date().toISOString(),
                  isExp: false,
                  isExpDoc: true,
                },
              });
              onSuccess && onSuccess();
            }
          }}
        />
      ),
    },
    {
      key: "3",
      label: "Sin expediente",
      children: (
        <NonExpAssociateForm
          onSubmit={onSubmit}
          allowFather={!onlyChild && !isRoot}
        />
      ),
    },
  ];

  return <Tabs defaultActiveKey="1" items={tabs} style={{ minHeight: 450 }} />;
}
