export function extractErrorMessage(ex, fallback = "Greška.") {
  const status = ex?.response?.status;
  const data = ex?.response?.data;

  // Backend često vraća plain string (ResponseEntity.body("..."))
  if (typeof data === "string" && data.trim()) return data;

  // Neki backendovi vraćaju { message: "..." }
  if (data && typeof data === "object" && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  // Login UX
  if (status === 401) return "Pogrešan email ili šifra.";

  return ex?.message || fallback;
}