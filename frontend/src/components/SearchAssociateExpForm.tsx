import { ApartmentOutlined, FolderOutlined } from "@ant-design/icons";
import { Col, List, Button, Card, Empty, Avatar, Space, Result } from "antd";
import { SearchExpForm } from "./SearchExpForm";
import { ExpSearchResponse } from "@/types/apiGde";

export function SearchAssociateExpForm({
  handleSearch,
  handleReset,
  isSearching,
  existingIds,
  showEmpty,
  searchData,
  handleAssociate,
  allowFather = false,
}: {
  handleSearch: (value: { year: number; number: number }) => void;
  handleReset: () => void;
  isSearching: boolean;
  existingIds: string[];
  showEmpty: boolean;
  searchData?: ExpSearchResponse;
  handleAssociate: (isFather: boolean) => void;
  allowFather?: boolean;
}) {
  return (
    <Space size="middle" direction="vertical" style={{ width: "100%" }}>
      <SearchExpForm
        withTitle={false}
        handleSubmit={handleSearch}
        handleReset={handleReset}
        isSearching={isSearching}
      />
      {/* Mostrar resultados de busqueda */}
      {showEmpty && (
        <Col span={24}>
          <Card style={{ width: "100%" }}>
            <Empty description="No se encontro el expediente solicitado. Verifique los datos ingresados" />
          </Card>
        </Col>
      )}
      {searchData && !existingIds.includes(String(searchData.ID)) && (
        <Col span={24}>
          <List
            itemLayout="horizontal"
            size="large"
            dataSource={[
              {
                code: searchData.CODIGO,
                description: searchData.DESCRIPCION,
              },
            ]}
            loading={isSearching}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Button
                    key="asoc-father-btn"
                    disabled={!allowFather}
                    icon={<ApartmentOutlined />}
                    onClick={() => handleAssociate(true)}
                  >
                    Asociar como Padre
                  </Button>,
                  <Button
                    key="asoc-child-btn"
                    icon={<ApartmentOutlined />}
                    onClick={() => handleAssociate(false)}
                  >
                    Asociar como Hijo
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={item.code}
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </Col>
      )}
      {/* Mostrar mensaje de error si se intenta asociar a si mismo */}
      {searchData && existingIds.includes(String(searchData.ID)) && (
        <Result
          status="error"
          title="No se puede asociar un expediente que ya existe en el arbol"
        />
      )}
    </Space>
  );
}
