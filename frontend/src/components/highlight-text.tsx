import { Typography } from "antd";
import React from "react";

const { Text } = Typography;

function normalizeText(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remover acentos
}

export const HighlightedText = ({
  text,
  searchTerm,
  maxLength = 150,
}: {
  text: string;
  searchTerm: string;
  maxLength?: number;
}) => {
  if (!searchTerm) return <Text>{text}</Text>;

  // Normalize and split the search term into words
  const normalizedSearchTerms = normalizeText(searchTerm)
    .split(/\s+/) // Split on whitespace
    .filter((term) => term.length > 0) // Remove empty strings
    .map((term) => term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")); // Escape special characters

  if (normalizedSearchTerms.length === 0) return <Text>{text}</Text>;

  // Create a regex to match any of the terms
  const regex = new RegExp(`(${normalizedSearchTerms.join("|")})`, "gi");

  // Normalize the input text for comparison
  const normalizedText = normalizeText(text);

  // Find all matches and calculate their positions
  const matches = [...normalizedText.matchAll(regex)].map((match) => ({
    start: match.index || 0,
    end: (match.index || 0) + match[0].length,
  }));

  if (matches.length === 0) return <Text>{text}</Text>;

  // Determine the range of text to keep
  const firstMatchStart = matches[0].start;
  const lastMatchEnd = matches[matches.length - 1].end;

  const displayStart = Math.max(0, firstMatchStart - Math.floor(maxLength / 2));
  const displayEnd = Math.min(
    text.length,
    lastMatchEnd + Math.floor(maxLength / 2)
  );
  const isTruncatedStart = displayStart > 0;
  const isTruncatedEnd = displayEnd < text.length;

  const visibleText = text.slice(displayStart, displayEnd);

  // Split the visible text based on the regex
  const parts = visibleText.split(regex);

  return (
    <Text>
      {isTruncatedStart && "..."}
      {parts.map((part, index) => {
        const isMatch = normalizedSearchTerms.some(
          (term) => normalizeText(part).toLowerCase() === term.toLowerCase()
        );
        return isMatch ? (
          <Text key={index} mark>
            {part}
          </Text>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
      {isTruncatedEnd && "..."}
    </Text>
  );
};
