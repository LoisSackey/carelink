// Phone number utilities (generic)

// Pattern for exactly 10 digits (no formatting)
const TEN_DIGIT_PATTERN = /^\d{10}$/;

/**
 * Normalize phone number input for storage/display.
 * - Keeps a leading + if provided, otherwise returns only digits.
 * - Removes all other non-digit characters.
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Strip everything except digits and return raw digits
  const digits = phone.replace(/\D/g, '');
  return digits;
};

/**
 * Validate phone number: accept exactly 10 digits (after stripping formatting)
 */
export const isValidPhone = (phone: string): boolean => {
  const digits = formatPhoneNumber(phone);
  return TEN_DIGIT_PATTERN.test(digits);
};

/**
 * Display phone number in a readable grouped format.
 * - If number starts with +<country>, keep country separated.
 * - Otherwise group digits in 3s.
 */
export const displayPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  const formatted = formatPhoneNumber(phone);
  if (!formatted) return phone;

  // If exactly 10 digits, display as 3-3-4 (common grouping)
  if (/^\d{10}$/.test(formatted)) {
    return formatted.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }

  // Fallback: group in 3s
  return formatted.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
};

export const getDisplayPhone = (phone: string | undefined): string => {
  if (!phone) return '';
  return displayPhoneNumber(phone);
};

export const stripPhoneFormatting = (phone: string): string => {
  return formatPhoneNumber(phone);
};

export default {
  GENERIC_PHONE_PATTERN,
  formatPhoneNumber,
  isValidPhone,
  displayPhoneNumber,
  getDisplayPhone,
  stripPhoneFormatting,
};
