import {
  ApartmentOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { Col, List, Button, Card, Empty, Avatar, Space, Result } from "antd";
import { SearchExpForm } from "./SearchExpForm";

export function SearchAssociateExpForm({
  handleSearch,
  handleReset,
  isSearching,
  existingIds,
  showEmpty,
  searchData,
  handleAssociate,
  allowFather = false,
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
          <Card bordered={false} style={{ width: "100%" }}>
            <Empty description="No se encontro el expediente solicitado. Verifique los datos ingresados" />
          </Card>
        </Col>
      )}
      {searchData.length > 0 &&
        !existingIds.includes(String(searchData[0].ID)) && (
          <Col span={24}>
            <List
              itemLayout="horizontal"
              size="large"
              dataSource={[
                {
                  code: searchData[0].CODIGO,
                  description: searchData[0].DESCRIPCION,
                },
              ]}
              loading={isSearching}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button
                      disabled={!allowFather}
                      icon={<ApartmentOutlined />}
                      onClick={() => handleAssociate(true)}
                    >
                      Asociar como Padre
                    </Button>,
                    <Button
                      icon={<ApartmentOutlined />}
                      onClick={() => handleAssociate(false)}
                    >
                      Asociar como Hijo
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<FolderOutlined />} />}
                    title={item.code}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </Col>
        )}
      {/* Mostrar mensaje de error si se intenta asociar a si mismo */}
      {searchData.length > 0 &&
        existingIds.includes(String(searchData[0].ID)) && (
          <Result
            status="error"
            title="No se puede asociar un expediente que ya existe en el arbol"
          />
        )}
    </Space>
  );
}
