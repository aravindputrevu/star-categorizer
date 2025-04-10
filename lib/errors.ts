/**
 * Standardized error handling utilities for API routes
 */

import { NextResponse } from 'next/server';
import { logger } from './utils';

export class AppError extends Error {
  public statusCode: number;
  public context?: Record<string, any>;
  
  constructor(message: string, statusCode: number = 500, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
  }
  
  toJSON() {
    return {
      error: this.message,
      status: this.statusCode,
      ...(this.context && { context: this.context })
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 404, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 401, context);
  }
}

export function handleApiError(error: any) {
  if (error instanceof AppError) {
    logger.warn(`API Error: ${error.message}`, error.context);
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }
  
  logger.error('Unhandled error', error);
  return NextResponse.json(
    { error: 'An unexpected error occurred', status: 500 },
    { status: 500 }
  );
}
