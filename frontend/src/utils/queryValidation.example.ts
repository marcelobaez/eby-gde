/**
 * Example usage of queryValidation utilities
 * This file demonstrates how to use the validation functions in API routes
 */

import { NextApiRequest, NextApiResponse } from "next";
import {
  validateSearchQuery,
  validatePageNumber,
  validatePageSize,
  validateYear,
  validateDocumentType,
  validateId,
  validateStringPattern,
  validateQueryParams,
} from "./queryValidation";

// Example 1: Individual validation with manual error handling
export function example1_IndividualValidation(req: NextApiRequest, res: NextApiResponse) {
  const { searchQuery, page, pageSize } = req.query;

  // Validate search query
  const searchResult = validateSearchQuery(searchQuery);
  if (!searchResult.isValid) {
    return res.status(400).json({ error: searchResult.error });
  }

  // Validate page number
  const pageResult = validatePageNumber(page);
  if (!pageResult.isValid) {
    return res.status(400).json({ error: pageResult.error });
  }

  // Validate page size
  const pageSizeResult = validatePageSize(pageSize);
  if (!pageSizeResult.isValid) {
    return res.status(400).json({ error: pageSizeResult.error });
  }

  // Use validated values
  const query = searchResult.value as string;
  const pageNum = pageResult.value as number;
  const size = pageSizeResult.value as number;

  // Your API logic here...
}

// Example 2: Batch validation with try-catch
export function example2_BatchValidation(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validated = validateQueryParams({
      searchQuery: req.query.searchQuery,
      page: req.query.page,
      pageSize: req.query.pageSize,
      year: req.query.year,
      type: req.query.type,
    });

    // Use validated values directly
    const { searchQuery, page, pageSize, year, type } = validated;

    // Your API logic here...
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

// Example 3: Optional parameters
export function example3_OptionalParameters(req: NextApiRequest, res: NextApiResponse) {
  const { year, type } = req.query;

  // Year is optional - returns null if not provided
  const yearResult = validateYear(year);
  if (!yearResult.isValid) {
    return res.status(400).json({ error: yearResult.error });
  }
  const yearFilter = yearResult.value; // Can be number or null

  // Type is optional - returns null if not provided
  const typeResult = validateDocumentType(type);
  if (!typeResult.isValid) {
    return res.status(400).json({ error: typeResult.error });
  }
  const typeFilter = typeResult.value; // Can be string or null

  // Your API logic here...
  // if (yearFilter) { ... }
  // if (typeFilter) { ... }
}

// Example 4: ID validation
export function example4_IdValidation(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  // Validate numeric ID
  const idResult = validateId(id, "numeric");
  if (!idResult.isValid) {
    return res.status(400).json({ error: idResult.error });
  }
  const numericId = idResult.value as number;

  // Or validate UUID
  const uuidResult = validateId(id, "uuid");
  if (!uuidResult.isValid) {
    return res.status(400).json({ error: uuidResult.error });
  }
  const uuidId = uuidResult.value as string;

  // Your API logic here...
}

// Example 5: Custom pattern validation
export function example5_CustomPattern(req: NextApiRequest, res: NextApiResponse) {
  const { codigo } = req.query;

  // Validate a custom pattern (e.g., reparticion code: 2 letters + 4 numbers)
  const codigoResult = validateStringPattern(
    codigo,
    /^[A-Z]{2}\d{4}$/,
    "Codigo must be 2 uppercase letters followed by 4 digits (e.g., AB1234)",
    10
  );

  if (!codigoResult.isValid) {
    return res.status(400).json({ error: codigoResult.error });
  }

  const validCodigo = codigoResult.value as string;

  // Your API logic here...
}

// Example 6: Custom limits
export function example6_CustomLimits(req: NextApiRequest, res: NextApiResponse) {
  const { searchQuery, page, pageSize } = req.query;

  // Use custom limits
  const searchResult = validateSearchQuery(searchQuery, 3, 1000); // Min 3, max 1000 chars
  const pageResult = validatePageNumber(page, 1, 5000); // Allow up to 5000 pages
  const pageSizeResult = validatePageSize(pageSize, 10, 500); // Min 10, max 500 items

  if (!searchResult.isValid) {
    return res.status(400).json({ error: searchResult.error });
  }
  if (!pageResult.isValid) {
    return res.status(400).json({ error: pageResult.error });
  }
  if (!pageSizeResult.isValid) {
    return res.status(400).json({ error: pageSizeResult.error });
  }

  // Your API logic here...
}
