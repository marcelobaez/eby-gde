export function validateDateParam(
  value: unknown
): { isValid: boolean; value: string | null; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { isValid: true, value: null };
  }

  if (typeof value !== "string") {
    return { isValid: false, value: null, error: "Date must be a string" };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!dateRegex.test(value)) {
    return { isValid: false, value: null, error: "Invalid date format. Expected YYYY-MM-DD" };
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { isValid: false, value: null, error: "Invalid date value" };
  }

  return { isValid: true, value: value };
}
