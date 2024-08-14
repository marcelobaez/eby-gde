import React, { useState } from "react";
import { Input, Flex, Empty, List, Button, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useDebouncedState } from "@react-hookz/web";
import { api } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { ExpDocDetailResponse, ExpDocsResponse } from "@/types/expDoc";
import { sedesCodes } from "@/utils";
const { Search } = Input;

type SearchExpDocFormProps = {
  handleSubmit?: (values?: ExpDocDetailResponse["data"]) => void;
  mode?: "verify" | "associate";
  targetExpCode?: string;
  onAssociate?: (
    asFather: boolean,
    selectedExp: ExpDocDetailResponse["data"]
  ) => void;
  existingIds?: string[];
  allowFather?: boolean;
};

const SearchDocExp = ({
  handleSubmit,
  mode,
  targetExpCode,
  onAssociate,
  existingIds,
  allowFather = true,
}: SearchExpDocFormProps) => {
  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useDebouncedState("", 500);
  const selectedMode = mode ?? "verify";

  const { data, isLoading } = useQuery({
    queryKey: ["searchExp", debouncedValue],
    queryFn: async () => {
      const { data } = await api.get<ExpDocsResponse>(
        `/expedientes-docs?filters[$or][0][ASUNTO][$containsi]=${debouncedValue}&filters[$or][1][NRO_ORDEN][$containsi]=${debouncedValue}&filters[$or][2][CAUSANTE][$containsi]=${debouncedValue}`
      );

      return data.data;
    },
    enabled: Boolean(debouncedValue) && debouncedValue.length > 2,
  });

  return (
    <Flex gap="middle" align="center" justify="center" vertical>
      <Search
        onChange={(e) => {
          setValue(e.target.value);
          setDebouncedValue(e.target.value);
        }}
        onSearch={(v, e, info) => {
          if (e && info?.source === "clear") {
            handleSubmit && handleSubmit();
          }
        }}
        value={value}
        placeholder="Buscar por numero de orden, expte, asunto, causante"
        allowClear
        loading={isLoading}
        style={{ maxWidth: 500 }}
      />
      {data && data.length === 0 && (
        <Empty description="No se encontraron resultados"></Empty>
      )}
      {data && data.length > 0 && (
        <List
          style={{ width: "100%" }}
          dataSource={data}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                title={`Nro Orden: ${item.attributes.NRO_ORDEN} - Causante: ${item.attributes.CAUSANTE}`}
                description={item.attributes.ASUNTO}
              />
              {selectedMode === "verify" && (
                <Button
                  icon={<SearchOutlined />}
                  onClick={() => {
                    handleSubmit && handleSubmit(item);
                  }}
                >
                  Ver relaciones
                </Button>
              )}
              {selectedMode === "associate" && onAssociate && (
                <Space>
                  <Button
                    disabled={
                      !targetExpCode ||
                      !allowFather ||
                      !getCanAssociate(item, targetExpCode, existingIds)
                    }
                    onClick={() => {
                      onAssociate(true, item);
                    }}
                  >
                    Asociar como Padre
                  </Button>
                  <Button
                    disabled={
                      !targetExpCode ||
                      !getCanAssociate(item, targetExpCode, existingIds)
                    }
                    onClick={() => {
                      onAssociate(false, item);
                    }}
                  >
                    Asociar como Hijo
                  </Button>
                </Space>
              )}
            </List.Item>
          )}
        />
      )}
    </Flex>
  );
};

const getCanAssociate = (
  data: ExpDocDetailResponse["data"],
  targetExpCode: string,
  existingIds?: string[]
) => {
  const code = `${
    sedesCodes[data.attributes.SEDE as keyof typeof sedesCodes]
  }-${data.attributes.NRO_ORDEN}-${data.attributes.NRO_EXPE}-${
    data.attributes.SEDE
  }`;
  return existingIds
    ? code !== targetExpCode && !existingIds.includes(code)
    : code !== targetExpCode;
};

export const SearchDocExpForm = React.memo(SearchDocExp);
