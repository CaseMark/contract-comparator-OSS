// Input validation schemas for contract comparator API
// Ported from contract-clause-comparator with adaptations

import { z } from 'zod';

// Size limits
const MAX_CONTRACT_TEXT_LENGTH = 500000; // ~100 pages
const MAX_NAME_LENGTH = 200;
const MAX_FILENAME_LENGTH = 255;

// Sanitize string to prevent XSS/injection
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

// ============================================================================
// Contract Schemas
// ============================================================================

export const createContractSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
    .transform(sanitizeString),
  fileName: z
    .string()
    .min(1, 'Filename is required')
    .max(MAX_FILENAME_LENGTH, `Filename must be less than ${MAX_FILENAME_LENGTH} characters`)
    .transform(sanitizeString),
  fileType: z.enum(['pdf', 'docx', 'txt']),
  content: z
    .string()
    .min(1, 'Contract content is required')
    .max(MAX_CONTRACT_TEXT_LENGTH, `Contract text must be less than ${MAX_CONTRACT_TEXT_LENGTH} characters`)
    .transform(sanitizeString),
  isTemplate: z.boolean().optional().default(false),
});

export const processContractSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  content: z
    .string()
    .min(1, 'Contract content is required')
    .max(MAX_CONTRACT_TEXT_LENGTH, `Contract text must be less than ${MAX_CONTRACT_TEXT_LENGTH} characters`)
    .transform(sanitizeString),
});

// ============================================================================
// Comparison Schemas
// ============================================================================

export const createComparisonWithTextSchema = z.object({
  name: z
    .string()
    .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
    .transform(sanitizeString)
    .optional(),
  comparisonNumber: z.number().int().positive().optional(),
  sourceText: z
    .string()
    .min(1, 'Source contract text is required')
    .max(MAX_CONTRACT_TEXT_LENGTH, `Source text must be less than ${MAX_CONTRACT_TEXT_LENGTH} characters`)
    .transform(sanitizeString),
  targetText: z
    .string()
    .min(1, 'Target contract text is required')
    .max(MAX_CONTRACT_TEXT_LENGTH, `Target text must be less than ${MAX_CONTRACT_TEXT_LENGTH} characters`)
    .transform(sanitizeString),
  sourceFileName: z
    .string()
    .max(MAX_FILENAME_LENGTH)
    .transform(sanitizeString)
    .optional(),
  targetFileName: z
    .string()
    .max(MAX_FILENAME_LENGTH)
    .transform(sanitizeString)
    .optional(),
});

export const createComparisonWithIdsSchema = z.object({
  name: z
    .string()
    .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
    .transform(sanitizeString)
    .optional(),
  sourceContractId: z.string().uuid('Invalid source contract ID'),
  targetContractId: z.string().uuid('Invalid target contract ID'),
});

export const updateComparisonSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
    .transform(sanitizeString),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const listQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

// ============================================================================
// Validation Helper
// ============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return { success: false, error: errors };
  }

  return { success: true, data: result.data };
}

// ============================================================================
// Type Exports
// ============================================================================

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type ProcessContractInput = z.infer<typeof processContractSchema>;
export type CreateComparisonWithTextInput = z.infer<typeof createComparisonWithTextSchema>;
export type CreateComparisonWithIdsInput = z.infer<typeof createComparisonWithIdsSchema>;
export type UpdateComparisonInput = z.infer<typeof updateComparisonSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
