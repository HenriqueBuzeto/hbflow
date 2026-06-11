/**
 * Sanitize audit metadata to remove sensitive information
 */

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'whatsappToken',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'cpf',
  'cnpj',
];

const MAX_STRING_LENGTH = 1000;
const MAX_OBJECT_DEPTH = 5;

/**
 * Remove sensitive fields from an object recursively
 */
export function sanitizeMetadata(metadata: any): any {
  if (!metadata) {
    return metadata;
  }

  // Handle primitives
  if (typeof metadata !== 'object') {
    return metadata;
  }

  // Handle arrays
  if (Array.isArray(metadata)) {
    return metadata.slice(0, 10).map(item => sanitizeMetadata(item));
  }

  // Handle objects
  const sanitized: any = {};
  let depth = 0;

  function sanitize(obj: any, currentDepth: number): any {
    if (currentDepth > MAX_OBJECT_DEPTH) {
      return '[Object truncated - max depth exceeded]';
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 10).map(item => sanitize(item, currentDepth + 1));
    }

    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        
        // Skip sensitive fields
        if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
          continue;
        }

        // Sanitize string values
        if (typeof obj[key] === 'string') {
          result[key] = obj[key].length > MAX_STRING_LENGTH 
            ? obj[key].substring(0, MAX_STRING_LENGTH) + '... [truncated]'
            : obj[key];
        } else {
          result[key] = sanitize(obj[key], currentDepth + 1);
        }
      }
    }

    return result;
  }

  return sanitize(metadata, depth);
}

/**
 * Check if a field name is sensitive
 */
export function isSensitiveField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(field => lowerName.includes(field));
}
