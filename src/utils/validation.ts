/**
 * Input validation utilities for the Question Sheet Manager
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a name field (topic, sub-topic names)
 */
export function validateName(
  name: string,
  existingNames: string[],
  fieldLabel: string = 'Name'
): ValidationResult {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} is required` };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: `${fieldLabel} must be at least 2 characters` };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: `${fieldLabel} must be less than 100 characters` };
  }
  
  const normalizedName = trimmed.toLowerCase();
  const isDuplicate = existingNames.some(
    existing => existing.toLowerCase() === normalizedName
  );
  
  if (isDuplicate) {
    return { valid: false, error: `${fieldLabel} already exists` };
  }
  
  return { valid: true };
}

/**
 * Validates a question title
 */
export function validateQuestionTitle(
  title: string,
  existingTitles: string[]
): ValidationResult {
  const trimmed = title.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Question title is required' };
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Question title must be at least 3 characters' };
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: 'Question title must be less than 200 characters' };
  }
  
  const normalizedTitle = trimmed.toLowerCase();
  const isDuplicate = existingTitles.some(
    existing => existing.toLowerCase() === normalizedTitle
  );
  
  if (isDuplicate) {
    return { valid: false, error: 'Question with this title already exists' };
  }
  
  return { valid: true };
}

/**
 * Validates an external URL using URL constructor (not regex)
 */
export function validateUrl(url: string): ValidationResult {
  const trimmed = url.trim();
  
  // Empty URL is valid (optional field)
  if (!trimmed) {
    return { valid: true };
  }
  
  try {
    const parsed = new URL(trimmed);
    
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use http or https protocol' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates difficulty value
 */
export function validateDifficulty(
  difficulty: string
): ValidationResult {
  if (!difficulty) {
    return { valid: true }; // Optional field
  }
  
  const validDifficulties = ['Easy', 'Medium', 'Hard'];
  if (!validDifficulties.includes(difficulty)) {
    return { valid: false, error: 'Invalid difficulty level' };
  }
  
  return { valid: true };
}

/**
 * Generates a collision-resistant unique ID
 */
export function generateId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback with higher entropy
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart1}-${randomPart2}`;
}
