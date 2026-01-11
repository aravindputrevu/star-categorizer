import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Logger utility for Cloudflare Workers environment
 * 
 * This provides consistent logging across the application while being compatible 
 * with Cloudflare Workers environment, which uses console methods but benefits
 * from structured logging.
 */
export const logger = {
  /**
   * Log info level message
   */
  info: (message: string, data?: Record<string, any>) => {
    if (data) {
      console.info(JSON.stringify({
        level: 'info',
        message,
        ...data,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.info(`[INFO] ${message}`);
    }
  },

  /**
   * Log debug level message (only in development)
   */
  debug: (message: string, data?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data) {
        console.debug(JSON.stringify({
          level: 'debug',
          message,
          ...data,
          timestamp: new Date().toISOString()
        }));
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  },

  /**
   * Log warning level message
   */
  warn: (message: string, data?: Record<string, any>) => {
    if (data) {
      console.warn(JSON.stringify({
        level: 'warn',
        message,
        ...data,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  /**
   * Log error level message
   */
  error: (message: string, error?: Error | unknown, data?: Record<string, any>) => {
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: errorObj,
      ...(data || {}),
      timestamp: new Date().toISOString()
    }));
  }
};