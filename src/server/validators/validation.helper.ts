import { ZodError, ZodSchema } from 'zod';
import { NextResponse } from 'next/server';

// Pagination limits
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 5000;

// Standard API error format
export interface StandardApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details: Array<{
      path: string;
      message: string;
    }>;
  };
}

// Validate request body
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw formatZodError(error);
    }
    throw error;
  }
}

// Validate query parameters
export function validateQuery<T>(schema: ZodSchema<T>, searchParams: URLSearchParams): T {
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  try {
    return schema.parse(query);
  } catch (error) {
    if (error instanceof ZodError) {
      throw formatZodError(error);
    }
    throw error;
  }
}

// Validate route parameters
export function validateParams<T>(schema: ZodSchema<T>, params: unknown): T {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      throw formatZodError(error);
    }
    throw error;
  }
}

// Format Zod error to standard API error
function formatZodError(error: ZodError): StandardApiError {
  console.error('ZodError details:', {
    issues: error.issues,
    message: error.message,
  });
  
  const details = error.issues.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos.',
      details,
    },
  };
}

// Handle validation error in API routes
export function handleValidationError(error: unknown) {
  if (error instanceof ZodError) {
    const formatted = formatZodError(error);
    return NextResponse.json(formatted, { status: 400 });
  }

  if (typeof error === 'object' && error !== null && 'success' in error) {
    return NextResponse.json(error, { status: 400 });
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details: [],
      },
    },
    { status: 400 }
  );
}

// Common pagination schema
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.string().default(DEFAULT_PAGE.toString()).transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) return DEFAULT_PAGE;
    return num;
  }),
  pageSize: z.string().default(DEFAULT_PAGE_SIZE.toString()).transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) return DEFAULT_PAGE_SIZE;
    if (num > MAX_PAGE_SIZE) return MAX_PAGE_SIZE;
    return num;
  }),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const searchSchema = z.object({
  search: z.string().optional(),
});

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');
