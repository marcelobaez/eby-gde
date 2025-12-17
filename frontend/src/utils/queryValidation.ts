/**
 * Query parameter validation utilities for API routes
 * Provides security checks to prevent SQL injection, resource exhaustion, and invalid inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: any;
}

/**
 * Validates a search query string
 * @param query - The search query to validate
 * @param minLength - Minimum allowed length (default: 1)
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns ValidationResult with sanitized query string
 */
export function validateSearchQuery(
  query: unknown,
  minLength: number = 1,
  maxLength: number = 500
): ValidationResult {
  if (!query) {
    return {
      isValid: false,
      error: "Search query is required.",
    };
  }

  const queryStr = String(query).trim();

  if (queryStr.length < minLength || queryStr.length > maxLength) {
    return {
      isValid: false,
      error: `Search query must be between ${minLength} and ${maxLength} characters.`,
    };
  }

  return {
    isValid: true,
    value: queryStr,
  };
}

/**
 * Validates a page number parameter
 * @param page - The page number to validate
 * @param min - Minimum allowed page (default: 1)
 * @param max - Maximum allowed page (default: 10000)
 * @returns ValidationResult with parsed page number
 */
export function validatePageNumber(
  page: unknown,
  min: number = 1,
  max: number = 10000
): ValidationResult {
  const pageNumber = parseInt(String(page), 10);

  if (isNaN(pageNumber)) {
    return {
      isValid: false,
      error: "Page number must be a valid number.",
    };
  }

  if (pageNumber < min || pageNumber > max) {
    return {
      isValid: false,
      error: `Page number must be between ${min} and ${max}.`,
    };
  }

  return {
    isValid: true,
    value: pageNumber,
  };
}

/**
 * Validates a page size parameter
 * @param pageSize - The page size to validate
 * @param min - Minimum allowed size (default: 1)
 * @param max - Maximum allowed size (default: 100)
 * @returns ValidationResult with parsed page size
 */
export function validatePageSize(
  pageSize: unknown,
  min: number = 1,
  max: number = 100
): ValidationResult {
  const size = parseInt(String(pageSize), 10);

  if (isNaN(size)) {
    return {
      isValid: false,
      error: "Page size must be a valid number.",
    };
  }

  if (size < min || size > max) {
    return {
      isValid: false,
      error: `Page size must be between ${min} and ${max}.`,
    };
  }

  return {
    isValid: true,
    value: size,
  };
}

/**
 * Validates a year parameter
 * @param year - The year to validate
 * @param minYear - Minimum allowed year (default: 1900)
 * @param maxYear - Maximum allowed year (default: current year + 1)
 * @returns ValidationResult with parsed year or null if not provided
 */
export function validateYear(
  year: unknown,
  minYear: number = 1900,
  maxYear: number = new Date().getFullYear() + 1
): ValidationResult {
  if (!year) {
    return {
      isValid: true,
      value: null,
    };
  }

  const yearValue = parseInt(String(year), 10);

  if (isNaN(yearValue)) {
    return {
      isValid: false,
      error: "Year must be a valid number.",
    };
  }

  if (yearValue < minYear || yearValue > maxYear) {
    return {
      isValid: false,
      error: `Year must be between ${minYear} and ${maxYear}.`,
    };
  }

  return {
    isValid: true,
    value: yearValue,
  };
}

/**
 * Validates a document type/acronym parameter
 * Allows only alphanumeric characters, hyphens, underscores, and spaces
 * @param type - The document type to validate
 * @param maxLength - Maximum allowed length (default: 50)
 * @returns ValidationResult with sanitized type string or null if not provided
 */
export function validateDocumentType(
  type: unknown,
  maxLength: number = 50
): ValidationResult {
  if (!type) {
    return {
      isValid: true,
      value: null,
    };
  }

  const typeStr = String(type).trim();

  // Security: Only allow alphanumeric characters and basic punctuation
  const pattern = new RegExp(`^[a-zA-Z0-9\\-_\\s]{1,${maxLength}}$`);

  if (!pattern.test(typeStr)) {
    return {
      isValid: false,
      error: "Invalid document type parameter. Only alphanumeric characters, hyphens, underscores and spaces allowed.",
    };
  }

  return {
    isValid: true,
    value: typeStr,
  };
}

/**
 * Validates a generic string parameter with custom pattern
 * @param value - The value to validate
 * @param pattern - Regex pattern to test against
 * @param errorMessage - Custom error message
 * @param maxLength - Maximum allowed length
 * @returns ValidationResult with sanitized string or null if not provided
 */
export function validateStringPattern(
  value: unknown,
  pattern: RegExp,
  errorMessage: string,
  maxLength: number = 100
): ValidationResult {
  if (!value) {
    return {
      isValid: true,
      value: null,
    };
  }

  const valueStr = String(value).trim();

  if (valueStr.length > maxLength) {
    return {
      isValid: false,
      error: `Value exceeds maximum length of ${maxLength} characters.`,
    };
  }

  if (!pattern.test(valueStr)) {
    return {
      isValid: false,
      error: errorMessage,
    };
  }

  return {
    isValid: true,
    value: valueStr,
  };
}

/**
 * Validates an ID parameter (numeric or UUID)
 * @param id - The ID to validate
 * @param type - Type of ID: "numeric" or "uuid" (default: "numeric")
 * @returns ValidationResult with parsed/validated ID
 */
export function validateId(
  id: unknown,
  type: "numeric" | "uuid" = "numeric"
): ValidationResult {
  if (!id) {
    return {
      isValid: false,
      error: "ID is required.",
    };
  }

  if (type === "numeric") {
    const idNum = parseInt(String(id), 10);
    if (isNaN(idNum) || idNum < 1) {
      return {
        isValid: false,
        error: "ID must be a valid positive number.",
      };
    }
    return {
      isValid: true,
      value: idNum,
    };
  } else if (type === "uuid") {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idStr = String(id).trim();
    if (!uuidPattern.test(idStr)) {
      return {
        isValid: false,
        error: "ID must be a valid UUID.",
      };
    }
    return {
      isValid: true,
      value: idStr,
    };
  }

  return {
    isValid: false,
    error: "Invalid ID type specified.",
  };
}

/**
 * Validates multiple query parameters at once
 * @param params - Object containing parameters to validate
 * @returns Object with validated values or throws error with first validation failure
 */
export function validateQueryParams(params: {
  searchQuery?: unknown;
  page?: unknown;
  pageSize?: unknown;
  year?: unknown;
  type?: unknown;
}) {
  const results: Record<string, any> = {};

  if (params.searchQuery !== undefined) {
    const result = validateSearchQuery(params.searchQuery);
    if (!result.isValid) throw new Error(result.error);
    results.searchQuery = result.value;
  }

  if (params.page !== undefined) {
    const result = validatePageNumber(params.page);
    if (!result.isValid) throw new Error(result.error);
    results.page = result.value;
  }

  if (params.pageSize !== undefined) {
    const result = validatePageSize(params.pageSize);
    if (!result.isValid) throw new Error(result.error);
    results.pageSize = result.value;
  }

  if (params.year !== undefined) {
    const result = validateYear(params.year);
    if (!result.isValid) throw new Error(result.error);
    results.year = result.value;
  }

  if (params.type !== undefined) {
    const result = validateDocumentType(params.type);
    if (!result.isValid) throw new Error(result.error);
    results.type = result.value;
  }

  return results;
}
