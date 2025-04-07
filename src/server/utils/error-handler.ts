import { NextResponse } from 'next/server';
import { TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import logger, { logError } from '../../utils/logger';

type TRPCErrorCode = 
  | 'PARSE_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_SUPPORTED'
  | 'TIMEOUT'
  | 'CONFLICT'
  | 'PRECONDITION_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNPROCESSABLE_CONTENT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'
  | 'NOT_IMPLEMENTED'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'CLIENT_CLOSED_REQUEST';

/**
 * Error codes and their corresponding HTTP status codes
 */
const ERROR_CODE_STATUS: Record<TRPCErrorCode, number> = {
  PARSE_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  CLIENT_CLOSED_REQUEST: 499, // Nginx standard code for client closed request
};

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  success: false;
};

/**
 * Creates a consistent error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  path: string,
  requestId?: string
): NextResponse<ErrorResponse> {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details = undefined;

  // Log the error with context
  if (error instanceof TRPCError) {
    // Handle tRPC errors
    code = error.code;
    message = error.message;
    // Safely get status code or default to 500
    statusCode = ERROR_CODE_STATUS[error.code as TRPCErrorCode] || 500;

    logError(error, {
      path,
      code: error.code,
      requestId,
    });
  } else if (error instanceof ZodError) {
    // Handle validation errors
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'Invalid request data';
    details = error.format();

    logger.warn({
      path,
      requestId,
      validationErrors: error.format(),
    }, 'Validation error in API request');
  } else if (error instanceof Error) {
    // Handle general errors
    logError(error, {
      path,
      requestId,
    });
  } else {
    // Handle unknown errors
    logError(new Error('Unknown error occurred'), {
      path,
      unknownError: error,
      requestId,
    });
  }

  // Return formatted error response
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      success: false,
    },
    { status: statusCode }
  );
}

/**
 * Creates a success response for API routes
 */
export function createSuccessResponse<T>(data: T): NextResponse<{ data: T; success: true }> {
  return NextResponse.json({
    data,
    success: true,
  });
} 