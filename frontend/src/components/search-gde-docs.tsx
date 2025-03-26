import { docTypes, repTypes } from "@/utils/constants";
import { FilePdfOutlined, SearchOutlined } from "@ant-design/icons";
import { Flex, Form, InputNumber, Select, Button, List, Empty } from "antd";
import axios from "axios";
import { useState } from "react";

type DocumentFormValues = {
  type: string;
  year: number;
  number: number;
  location: string;
};

export default function SearchGdeDocs() {
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const onFinish = async (values: DocumentFormValues) => {
    const { type, year, number, location } = values;
    try {
      setIsSearching(true);
      const resDoc = await axios.get("/api/documents/check", {
        params: {
          type,
          year,
          number,
          location,
          system: "GDEEBY",
        },
      });

      setNoResults(false);
      setFileUrl(`/api/documents?path=${encodeURIComponent(resDoc.data.url)}`);
      setFileName(
        `${type}-${year}-${String(number).padStart(
          8,
          "0"
        )}-GDEEBY-${location}.pdf`
      );
    } catch (error) {
      setNoResults(true);
      console.log(error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Flex justify="center" vertical>
      <Form
        name="basic"
        style={{ width: 450, margin: "0 auto" }}
        layout="vertical"
        initialValues={{
          type: "IF",
          year: new Date().getFullYear(),
          system: "GDEEBY",
        }}
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item
          label="Tipo de documento"
          name="type"
          rules={[
            {
              required: true,
              message: "Debe elegir un tipo de documento",
            },
          ]}
        >
          <Select
            placeholder="Elija el tipo de documento"
            allowClear
            options={docTypes}
          />
        </Form.Item>

        <Form.Item
          label="Año"
          name="year"
          rules={[
            {
              required: true,
              message: "El año es requerido",
            },
          ]}
        >
          <InputNumber min={2000} max={2050} />
        </Form.Item>

        <Form.Item
          label="Numero"
          name="number"
          rules={[
            {
              required: true,
              message: "El numero es requerido",
            },
          ]}
        >
          <InputNumber min={0} />
        </Form.Item>

        <Form.Item
          label="Reparticion"
          name="location"
          rules={[
            {
              required: true,
              message: "La reparticion es requerida",
            },
          ]}
        >
          <Select
            showSearch
            allowClear
            options={repTypes}
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.value ?? "")
                .toLocaleLowerCase()
                .includes(input.toLocaleLowerCase())
            }
            filterSort={(optionA, optionB) =>
              optionA.value
                .toLowerCase()
                .localeCompare(optionB.value.toLowerCase())
            }
            placeholder="Escriba el nombre de la reparticion"
          />
        </Form.Item>

        <Form.Item
          wrapperCol={{
            offset: 8,
            span: 16,
          }}
        >
          <Button
            type="primary"
            htmlType="submit"
            loading={isSearching}
            icon={<SearchOutlined />}
          >
            Buscar
          </Button>
        </Form.Item>
      </Form>
      {noResults && (
        <Empty
          style={{ marginTop: 20, width: 450, margin: "0 auto" }}
          description="No se encontraron resultados"
        />
      )}
      {!noResults && fileUrl.length > 0 && (
        <List
          itemLayout="horizontal"
          style={{ marginTop: 20, width: 450, margin: "0 auto" }}
          header="Resultado"
          dataSource={[{ title: fileName }]}
          renderItem={(item) => (
            <List.Item
              actions={[
                <a
                  href={fileUrl}
                  download={item.title}
                  key="list-download-link"
                >
                  Descargar archivo
                </a>,
              ]}
            >
              <List.Item.Meta
                avatar={<FilePdfOutlined />}
                title={item.title}
                // description={item.email}
              />
            </List.Item>
          )}
        />
      )}
    </Flex>
  );
}
