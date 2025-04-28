import { Button } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { mkConfig, generateCsv, download } from "export-to-csv";
import { format, parseISO } from "date-fns";
import esLocale from "date-fns/locale/es";

interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  disabled?: boolean;
  columns: {
    key: string;
    label: string;
    format?: (value: any) => string;
  }[];
}

export function ExportButton<T>({
  data,
  filename,
  disabled = false,
  columns,
}: ExportButtonProps<T>) {
  const handleExport = () => {
    const csvConfig = mkConfig({
      useKeysAsHeaders: true,
      filename,
    });

    // Transform data according to column definitions
    const transformedData = data.map((item) => {
      const transformedItem: Record<string, string> = {};
      columns.forEach(({ key, label, format }) => {
        const value = (item as any)[key];
        transformedItem[label] = format
          ? format(value)
          : value?.toString() || "";
      });
      return transformedItem;
    });

    const csv = generateCsv(csvConfig)(transformedData);
    download(csvConfig)(csv);
  };

  return (
    <Button
      disabled={disabled || !data || data.length === 0}
      icon={<FileExcelOutlined />}
      onClick={handleExport}
    >
      Exportar
    </Button>
  );
}
