import { Space, Select, Form, Button } from "antd";
import { useArbolExp, useGetArbolExpByGdeId } from "../hooks/useArbolExp";

export function RelationsModal({ id }) {
  const onFinish = (values) => {
    console.log("Success:", values);
  };
  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };
  const {
    data: allData,
    isLoading: isAllLoading,
    isError: isAllError,
  } = useArbolExp();
  const {
    data: expDetails,
    isLoading,
    isError,
    error,
  } = useGetArbolExpByGdeId(id);

  const handleChange = (value) => {
    console.log(`selected ${value}`);
  };

  if (isLoading || isAllLoading) {
    return <p>Cargando...</p>;
  }

  if (isError || isAllError) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <Space direction="vertical">
      <Form
        name="basic"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
        initialValues={{
          parent: expDetails[0].attributes.parent.data
            ? expDetails[0].attributes.expId
            : undefined,
          children: expDetails[0].attributes.children.data.map(
            (exp) => exp.attributes.expId
          ),
        }}
      >
        {expDetails[0].attributes.parent.data && (
          <Form.Item label="Padre" name="parent">
            <Select
              style={{ width: 250 }}
              // disabled
              allowClear
              defaultValue={
                expDetails[0].attributes.parent.data.attributes.expId
              }
              onChange={handleChange}
              options={allData.map((exp) => ({
                label: exp.attributes.expCode,
                value: exp.attributes.expId,
              }))}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? "").includes(input)
              }
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? "")
                  .toLowerCase()
                  .localeCompare((optionB?.label ?? "").toLowerCase())
              }
            />
          </Form.Item>
        )}
        {expDetails[0].attributes.children.data.length > 0 && (
          <Form.Item label="Hijos" name="children">
            <Select
              style={{ width: 300 }}
              mode="multiple"
              // disabled
              defaultValue={expDetails[0].attributes.children.data.map(
                (exp) => exp.attributes.expId
              )}
              onChange={handleChange}
              maxTagCount="responsive"
              options={allData.filter((exp) => {
                if (keys.includes(exp.attributes.expId)) {
                  return false;
                }
                return {
                  label: exp.attributes.expCode,
                  value: exp.attributes.expId,
                };
              })}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? "").includes(input)
              }
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? "")
                  .toLowerCase()
                  .localeCompare((optionB?.label ?? "").toLowerCase())
              }
            />
          </Form.Item>
        )}
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Guardar
          </Button>
        </Form.Item>
      </Form>
    </Space>
  );
}
