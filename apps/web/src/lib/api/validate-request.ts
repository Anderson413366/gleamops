/**
 * API request validation middleware using Zod schemas.
 * Parses JSON body, validates against schema, returns structured ProblemDetails on failure.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ZodSchema, ZodError } from 'zod';
import { createProblemDetails } from '@gleamops/shared';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

/**
 * Validate and parse a JSON request body against a Zod schema.
 *
 * @returns `{ data }` on success, `{ error: NextResponse }` on failure (400 with field-level errors)
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  instance: string
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      error: problemResponse(
        createProblemDetails(
          'VALIDATION_001',
          'Invalid request body',
          400,
          'Request body must be valid JSON',
          instance
        )
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const zodError = result.error as ZodError;
    const fieldErrors = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return {
      error: problemResponse(
        createProblemDetails(
          'VALIDATION_001',
          'Validation failed',
          400,
          `${fieldErrors.length} validation error(s)`,
          instance,
          fieldErrors
        )
      ),
    };
  }

  return { data: result.data };
}
