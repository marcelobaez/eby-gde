import React, { useMemo, useState } from "react";
import { Input, Flex, Empty, List, Button, Space, PaginationProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useDebouncedState } from "@react-hookz/web";
import { api } from "@/lib/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExpDocDetailResponse, ExpDocsResponse } from "@/types/expDoc";
import { sedesCodes } from "@/utils";
const FETCH_SIZE = 5;

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
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useDebouncedState("", 500);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery<ExpDocsResponse>({
    queryKey: ["searchExp", debouncedValue, currentPage],
    queryFn: async () => {
      const { data } = await api.get<ExpDocsResponse>(
        `/expedientes-docs?filters[$or][0][ASUNTO][$containsi]=${debouncedValue}&filters[$or][1][NRO_ORDEN][$containsi]=${debouncedValue}&filters[$or][2][CAUSANTE][$containsi]=${debouncedValue}&pagination[withCount]=true&pagination[page]=${currentPage}&pagination[pageSize]=${FETCH_SIZE}`
      );

      return data;
    },
    enabled: Boolean(debouncedValue) && debouncedValue.length > 2,
    refetchOnWindowFocus: false,
  });

  const memoData = useMemo(() => data?.data ?? [], [data]);

  const totalDBRowCount = data?.meta?.pagination?.total ?? 0;

  const onPageChange: PaginationProps["onChange"] = (page) => {
    setCurrentPage(page);
  };

  const selectedMode = mode ?? "verify";

  return (
    <Flex gap="middle" align="center" justify="center" vertical>
      <Search
        onChange={(e) => {
          setValue(e.target.value);
          setDebouncedValue(e.target.value);
        }}
        onSearch={(v, e, info) => {
          if (e && info?.source === "clear") {
            if (handleSubmit) {
              handleSubmit();
              queryClient.removeQueries({
                queryKey: ["searchExp", debouncedValue],
                exact: true,
              });
            }
          }
        }}
        value={value}
        placeholder="Buscar por numero de orden, expte, asunto, causante"
        allowClear
        loading={isLoading}
        style={{ maxWidth: 500 }}
      />
      {memoData.length === 0 &&
        debouncedValue.length > 2 &&
        !(isLoading || isFetching) && (
          <Empty description="No se encontraron resultados"></Empty>
        )}
      {memoData.length > 0 && (
        <List
          pagination={{
            onChange: onPageChange,
            defaultCurrent: currentPage,
            total: totalDBRowCount,
            pageSize: FETCH_SIZE,
            showTotal: (total, range) =>
              `Mostrando ${range[0]}-${range[1]} de ${total} resultados`,
          }}
          dataSource={memoData}
          style={{ maxHeight: 460, width: "100%" }}
          renderItem={(item) => (
            <List.Item style={{ padding: "5px 0px" }}>
              <List.Item.Meta
                title={`${
                  sedesCodes[item.attributes.SEDE as keyof typeof sedesCodes]
                }-${item.attributes.NRO_ORDEN}-${item.attributes.NRO_EXPE}-${
                  item.attributes.SEDE
                }`}
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
