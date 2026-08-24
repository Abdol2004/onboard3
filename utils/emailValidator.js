// utils/emailValidator.js

/**
 * List of allowed email domains for registration
 * Add or remove domains as needed
 */
const ALLOWED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com'
];

/**
 * Validates if an email address uses an allowed domain
 * @param {string} email - The email address to validate
 * @returns {Object} - { valid: boolean, domain: string, message: string }
 */
exports.validateEmailDomain = (email) => {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      domain: null,
      message: 'Invalid email format'
    };
  }

  // Extract domain from email
  const emailParts = email.toLowerCase().trim().split('@');
  
  if (emailParts.length !== 2) {
    return {
      valid: false,
      domain: null,
      message: 'Invalid email format'
    };
  }

  const domain = emailParts[1];

  // Check if domain is in allowed list
  const isAllowed = ALLOWED_DOMAINS.includes(domain);

  return {
    valid: isAllowed,
    domain: domain,
    message: isAllowed 
      ? 'Email domain is allowed' 
      : `Incorrect email`
  };
};

/**
 * Get list of allowed domains
 * @returns {Array} - Array of allowed domain strings
 */
exports.getAllowedDomains = () => {
  return [...ALLOWED_DOMAINS];
};

/**
 * Add a new domain to allowed list (for admin purposes)
 * @param {string} domain - Domain to add
 * @returns {boolean} - Success status
 */
exports.addAllowedDomain = (domain) => {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  
  const cleanDomain = domain.toLowerCase().trim();
  
  if (!ALLOWED_DOMAINS.includes(cleanDomain)) {
    ALLOWED_DOMAINS.push(cleanDomain);
    return true;
  }
  
  return false;
};