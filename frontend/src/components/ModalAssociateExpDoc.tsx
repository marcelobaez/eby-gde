import { Descriptions, Space, Tabs, Typography } from "antd";
import axios from "axios";
import { useState } from "react";
import { SearchAssociateExpForm } from "./SearchAssociateExpForm";
import { NonExpAssociateForm } from "./NonExpAssociateForm";
import { ExpSearchResponse } from "@/types/apiGde";
import { ExpDocDetailResponse } from "@/types/expDoc";
import { useCreateExpMutation } from "./ModalAssociateExp.utils";
import { SearchDocExpForm } from "./SearchDocExpForm";
import { sedesCodes } from "@/utils";

const { Text } = Typography;

export function ModalAssociateExpDoc({
  targetExpDoc,
  onSuccess,
}: {
  targetExpDoc: ExpDocDetailResponse["data"];
  onSuccess?: () => void;
}) {
  const createExpRelMutation = useCreateExpMutation();
  const [searchData, setSearchData] = useState<ExpSearchResponse>();
  const [isSearching, setIsSearching] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const targetExpCode = `${
    sedesCodes[targetExpDoc.attributes.SEDE as keyof typeof sedesCodes]
  }-${targetExpDoc.attributes.NRO_ORDEN}-${targetExpDoc.attributes.NRO_EXPE}-${
    targetExpDoc.attributes.SEDE
  }`;

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
      await createExpRelMutation.mutateAsync({
        parent: {
          notas: data.notas,
          title: data.title,
          expediente_tipo: data.expediente_tipo || undefined,
          isExp: false,
          isExpDoc: false,
        },
        child: {
          expCode: targetExpCode,
          descripcion: targetExpDoc.attributes.ASUNTO.substring(0, 255),
          fechaCreacion: new Date().toISOString(),
          isExp: false,
          isExpDoc: true,
        },
      });
      onSuccess && onSuccess();
    } else {
      await createExpRelMutation.mutateAsync({
        parent: {
          expCode: targetExpCode,
          descripcion: targetExpDoc.attributes.ASUNTO.substring(0, 255),
          fechaCreacion: new Date().toISOString(),
          isExp: false,
          isExpDoc: true,
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
          existingIds={[""]}
          showEmpty={showEmpty}
          searchData={searchData}
          handleAssociate={async (asFather) => {
            if (targetExpDoc && searchData) {
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
                    expCode: targetExpCode,
                    descripcion: targetExpDoc.attributes.ASUNTO.substring(
                      0,
                      255
                    ),
                    fechaCreacion: new Date().toISOString(),
                    isExp: false,
                    isExpDoc: true,
                  },
                });
                onSuccess && onSuccess();
              } else {
                await createExpRelMutation.mutateAsync({
                  parent: {
                    expCode: targetExpCode,
                    descripcion: targetExpDoc.attributes.ASUNTO.substring(
                      0,
                      255
                    ),
                    fechaCreacion: new Date().toISOString(),
                    isExp: false,
                    isExpDoc: true,
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
          allowFather={true}
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
          targetExpCode={targetExpCode}
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
                  expCode: targetExpCode,
                  descripcion: targetExpDoc.attributes.ASUNTO.substring(0, 255),
                  fechaCreacion: new Date().toISOString(),
                  isExp: false,
                  isExpDoc: true,
                },
              });
              onSuccess && onSuccess();
            } else {
              await createExpRelMutation.mutateAsync({
                parent: {
                  expCode: targetExpCode,
                  descripcion: targetExpDoc.attributes.ASUNTO.substring(0, 255),
                  fechaCreacion: new Date().toISOString(),
                  isExp: false,
                  isExpDoc: true,
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
      children: <NonExpAssociateForm onSubmit={onSubmit} />,
    },
  ];

  return (
    <Space direction="vertical" size="small">
      <Descriptions
        bordered
        title="Expediente Fisico base:"
        items={[
          {
            label: "Codigo",
            children: `${targetExpDoc.attributes.NRO_ORDEN}-${targetExpDoc.attributes.NRO_EXPE}-${targetExpDoc.attributes.SEDE}`,
          },
          {
            label: "Descripcion",
            children: targetExpDoc.attributes.ASUNTO,
          },
        ]}
      />
      <Text strong>Seleccione la opcion de asociacion</Text>
      <Tabs defaultActiveKey="1" items={tabs} />
    </Space>
  );
}
