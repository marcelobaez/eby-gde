import Link from "next/link";
import { Tooltip } from "antd";

export function extractOCFromMotivo(
  motivo: string,
): { ocNumber: string; matchedText: string } | null {
  const patterns = [
    /(Orden\s+de\s+Compra\s*N[°º]?\s*\d+(?:\.\d+)*)/i,
    /(OC\s*N[°º]?\s*\d+(?:\.\d+)*)/i,
    /(O\.C\s*N[°º]?\s*\d+(?:\.\d+)*)/i,
    /(OC\s*\.?\s*\d+(?:\.\d+)*)/i,
    /(O\.C\s*\.?\s*\d+(?:\.\d+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = motivo.match(pattern);
    if (match) {
      return {
        ocNumber: match[1].replace(/[^\d]/g, ""),
        matchedText: match[1],
      };
    }
  }
  return null;
}

export function renderMotivoWithOCLink(motivo: string) {
  const ocMatch = extractOCFromMotivo(motivo);

  if (!ocMatch) {
    return <>{motivo}</>;
  }

  const parts = motivo.split(ocMatch.matchedText);

  return (
    <>
      {parts[0]}
      <Tooltip title="Buscar en MAXIMO">
        <Link href={`?tab=maximo&oc=${ocMatch.ocNumber}`} shallow>
          <span className="cursor-pointer text-blue-600 hover:text-blue-800 underline">
            {ocMatch.matchedText}
          </span>
        </Link>
      </Tooltip>
      {parts[1]}
    </>
  );
}
