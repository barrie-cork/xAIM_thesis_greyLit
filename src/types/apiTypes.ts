import { OpenAPIV3 } from 'openapi-types';

/**
 * Type definitions for API documentation
 */

export interface ApiEndpoint {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  summary: string;
  description?: string;
  tags: string[];
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses: Record<string, OpenAPIV3.ResponseObject>;
  security?: OpenAPIV3.SecurityRequirementObject[];
}

export interface ApiSchema {
  type: string;
  properties?: Record<string, OpenAPIV3.SchemaObject>;
  required?: string[];
  items?: OpenAPIV3.SchemaObject;
  enum?: string[];
  format?: string;
  nullable?: boolean;
  default?: any;
  description?: string;
  minLength?: number;
  maxLength?: number;
} 