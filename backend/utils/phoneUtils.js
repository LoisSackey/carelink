// Phone number utilities for Ghana backend validation
// Used to ensure all phone numbers in the database use +233 format

const GHANA_CODE = '+233';
const GHANA_PATTERN = /^\+233\d{9}$/; // +233 followed by 9 digits

/**
 * Format phone number to Ghana format (+233XXXXXXXXX)
 * Accepts various input formats and normalizes to +233 format
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove leading 0 if present (Ghanaian numbers sometimes start with 0)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Remove leading 233 if present (international format without +)
  if (cleaned.startsWith('233')) {
    cleaned = cleaned.substring(3);
  }

  // Keep only digits
  cleaned = cleaned.replace(/\D/g, '');

  // Ensure it's exactly 9 digits
  if (cleaned.length === 9) {
    return `${GHANA_CODE}${cleaned}`;
  }

  // If less than 9 digits, return with GHANA_CODE prefix
  if (cleaned.length > 0 && cleaned.length < 9) {
    return `${GHANA_CODE}${cleaned}`;
  }

  return '';
}

/**
 * Validate if phone number is a valid Ghana number
 */
function isValidGhanaPhone(phone) {
  const formatted = formatPhoneNumber(phone);
  return GHANA_PATTERN.test(formatted);
}

/**
 * Display phone number in readable format
 * Converts +233123456789 to +233 123 456 789
 */
function displayPhoneNumber(phone) {
  if (!phone) return '';

  const formatted = formatPhoneNumber(phone);
  if (!formatted) return phone;

  // Format as +233 XXX XXX XXX
  return formatted.replace(/(\+233)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
}

/**
 * Middleware to normalize phone numbers on save
 * Use in user model or controller to ensure all phones are in Ghana format
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  
  const formatted = formatPhoneNumber(phone);
  
  if (!isValidGhanaPhone(formatted)) {
    throw new Error(`Invalid Ghana phone number: ${phone}. Must be in format +233XXXXXXXXX`);
  }
  
  return formatted;
}

module.exports = {
  GHANA_CODE,
  GHANA_PATTERN,
  formatPhoneNumber,
  isValidGhanaPhone,
  displayPhoneNumber,
  normalizePhoneNumber,
};
