import React, { useMemo, useState } from "react";
import {
  Input,
  Flex,
  Empty,
  List,
  Button,
  Space,
  PaginationProps,
  InputNumber,
  Skeleton,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useDebouncedState } from "@react-hookz/web";
import { api } from "@/lib/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExpDocDetailResponse, ExpDocsResponse } from "@/types/expDoc";
import { sedesCodes } from "@/utils";

const FETCH_SIZE = 5;

type SearchExpDocFormProps = {
  handleSubmit?: (values?: ExpDocDetailResponse["data"]) => void;
  mode?: "verify" | "associate" | "search";
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
  const [asuntoValue, setValue] = useState("");
  const [expteValue, setExpteValue] = useState("");
  const [ordenValue, setOrdenValue] = useState("");
  const [correspValue, setCorrespValue] = useState("");
  const [debouncedAsunto, setDebouncedValue] = useDebouncedState("", 500);
  const [debouncedExpte, setDebouncedExpte] = useDebouncedState("", 500);
  const [debouncedOrden, setDebouncedOrden] = useDebouncedState("", 500);
  const [debouncedCorresp, setDebouncedCorresp] = useDebouncedState("", 500);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery<ExpDocsResponse>({
    queryKey: [
      "searchExp",
      debouncedAsunto,
      debouncedExpte,
      debouncedOrden,
      debouncedCorresp,
      currentPage,
      FETCH_SIZE,
    ],
    queryFn: async () => {
      const { data } = await api.get<ExpDocsResponse>(
        `/expedientes-docs?${generateQueryFilter(
          debouncedAsunto,
          debouncedOrden,
          debouncedExpte,
          debouncedCorresp
        )}&pagination[withCount]=true&pagination[page]=${currentPage}&pagination[pageSize]=${FETCH_SIZE}`
      );

      return data;
    },
    enabled: Boolean(
      debouncedAsunto || debouncedOrden || debouncedCorresp || debouncedExpte
    ),
    refetchOnWindowFocus: false,
  });

  const memoData = useMemo(() => data?.data ?? [], [data]);

  const totalDBRowCount = data?.meta?.pagination?.total ?? 0;

  const onPageChange: PaginationProps["onChange"] = (page) => {
    setCurrentPage(page);
  };

  const selectedMode = mode ?? "verify";

  const handleReset = () => {
    if (handleSubmit) {
      setValue("");
      setDebouncedValue("");
      setOrdenValue("");
      setDebouncedOrden("");
      setExpteValue("");
      setDebouncedExpte("");
      setCorrespValue("");
      setDebouncedCorresp("");
      handleSubmit();
      queryClient.removeQueries({
        queryKey: [
          "searchExp",
          debouncedAsunto,
          debouncedCorresp,
          debouncedExpte,
          debouncedOrden,
        ],
        exact: true,
      });
    }
  };

  return (
    <Flex gap="middle" align="center" justify="center" vertical>
      <Flex gap="middle" align="center" justify="center">
        <InputNumber
          addonBefore="Orden"
          value={ordenValue}
          onChange={(e) => {
            if (e && parseInt(e.toString()) > 0) {
              setOrdenValue(e);
              setDebouncedOrden(e.toString());
            }
          }}
          style={{ maxWidth: 170 }}
          controls={false}
        />
        <InputNumber
          addonBefore="EXP"
          value={expteValue}
          onChange={(e) => {
            if (e && parseInt(e.toString()) > 0) {
              setExpteValue(e);
              setDebouncedExpte(e.toString());
            }
          }}
          controls={false}
          style={{ maxWidth: 170 }}
        />
        <InputNumber
          addonBefore="CDE"
          value={correspValue}
          onChange={(e) => {
            if (e && parseInt(e.toString()) > 0) {
              setCorrespValue(e);
              setDebouncedCorresp(e.toString());
            }
          }}
          controls={false}
          style={{ maxWidth: 170 }}
        />
        <Input
          onChange={(e) => {
            setValue(e.target.value);
            setDebouncedValue(e.target.value);
          }}
          addonBefore="Asunto"
          value={asuntoValue}
          allowClear
          style={{ maxWidth: 330 }}
        />
        <Button onClick={handleReset}>Limpiar</Button>
      </Flex>
      {memoData.length === 0 &&
        debouncedAsunto.length > 2 &&
        !(isLoading || isFetching) && (
          <Empty description="No se encontraron resultados"></Empty>
        )}
      {isFetching ? (
        <Skeleton />
      ) : (
        memoData.length > 0 && (
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
                    item.attributes.CORRESPO
                  }`}
                  description={item.attributes.ASUNTO}
                />
                {selectedMode === "verify" ||
                  (selectedMode === "associate" && (
                    <Button
                      icon={<SearchOutlined />}
                      onClick={() => {
                        handleSubmit && handleSubmit(item);
                      }}
                    >
                      Ver relaciones
                    </Button>
                  ))}
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
        )
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
    data.attributes.CORRESPO
  }`;
  return existingIds
    ? code !== targetExpCode && !existingIds.includes(code)
    : code !== targetExpCode;
};

function generateQueryFilter(
  debouncedAsunto: string,
  debouncedOrden: string,
  debouncedExpte: string,
  debouncedCorresp: string
) {
  const filters = [];

  if (debouncedAsunto.length > 2) {
    filters.push({ field: "ASUNTO", value: debouncedAsunto });
  }

  if (debouncedOrden.length > 0) {
    filters.push({ field: "NRO_ORDEN", value: debouncedOrden });
  }

  if (debouncedExpte.length > 0) {
    filters.push({ field: "NRO_EXPE", value: debouncedExpte });
  }

  if (debouncedCorresp.length > 0) {
    filters.push({ field: "CORRESPO", value: debouncedCorresp });
  }

  if (filters.length === 0) {
    return "";
  }

  const queryParts = filters.map(
    (filter, index) =>
      `filters[$and][${index}][${
        filter.field
      }][$containsi]=${encodeURIComponent(filter.value)}`
  );

  return queryParts.join("&");
}

export const SearchDocExpForm = React.memo(SearchDocExp);
