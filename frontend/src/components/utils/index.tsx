import { DocsResponse } from "@/types/apiGde";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { message } from "antd";

interface DocumentParts {
  type: string;
  year: number;
  number: number;
  location: string;
}

export function parseDocumentNameTyped(documentName: string): DocumentParts {
  const parts = documentName.split("-");

  if (parts.length < 5) {
    throw new Error("Invalid document name format");
  }

  const year = parseInt(parts[1], 10);
  const number = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(number)) {
    throw new Error("Invalid year or number format");
  }

  return {
    type: parts[0],
    year: year,
    number: number, // parseInt automatically removes leading zeros
    location: parts.slice(4).join("-"),
  };
}

// Utility function to trigger a download from a Blob
function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const useDownloadDocMutation = () =>
  useMutation({
    mutationFn: async (doc: DocsResponse) => {
      const { type, year, number, location } = parseDocumentNameTyped(
        doc.NUMERO_SADE
      );

      const resDoc = await axios.get("/api/documents/check", {
        params: {
          type: type,
          year: year,
          number: number,
          location: location,
          system: "GDEEBY",
        },
      });

      // Fetch the file as a Blob
      const fileResponse = await fetch(
        `/api/documents?path=${encodeURIComponent(resDoc.data.url)}`
      );
      if (!fileResponse.ok) throw new Error("No se pudo descargar el archivo");
      const blob = await fileResponse.blob();

      const fileName = `${type}-${year}-${String(
        number
      )}-GDEEBY-${location}.pdf`;
      return { blob, fileName };
    },
    onSuccess: ({ blob, fileName }) => {
      downloadBlob(blob, fileName);
    },
    onError: (error) => {
      message.error(
        "Ocurrió un error al intentar descargar el archivo. Por favor, intente nuevamente."
      );
    },
  });
