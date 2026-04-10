import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export const handleGhostApiError = (error: unknown): never => {
  if (error instanceof McpError) {
    throw error;
  }
  console.error('Ghost API Error:', error);
  const message = error instanceof Error ? error.message : String(error);
  throw new McpError(ErrorCode.InternalError, `Ghost API error: ${message}`);
};
