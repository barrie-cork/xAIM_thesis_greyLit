import { OpenAPIV3 } from 'openapi-types';
import { appRouter } from './trpc/router';

/**
 * Generate OpenAPI documentation for the Grey Literature Search API
 */
export function generateOpenApiSpec(): OpenAPIV3.Document {
  // Define the OpenAPI document
  const openApiDocument: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Grey Literature Search API',
      version: '1.0.0',
      description: 'API documentation for Grey Literature Search application',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/trpc',
        description: 'API Server',
      },
    ],
    paths: {},
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  // Add endpoints for each router
  addUserProcedures(openApiDocument);
  addSearchProcedures(openApiDocument);
  addResultsProcedures(openApiDocument);
  addReviewProcedures(openApiDocument);

  return openApiDocument;
}

/**
 * Add User endpoints to the OpenAPI specification
 */
function addUserProcedures(spec: OpenAPIV3.Document) {
  spec.paths['/user.getCurrent'] = {
    get: {
      summary: 'Get current user profile',
      description: 'Returns the currently authenticated user\'s profile information',
      tags: ['User'],
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'User profile retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  last_login: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'User not found',
        },
      },
    },
  };

  spec.paths['/user.updateProfile'] = {
    patch: {
      summary: 'Update user profile',
      description: 'Updates the currently authenticated user\'s profile information',
      tags: ['User'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'User profile updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  last_login: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'User not found',
        },
      },
    },
  };
}

/**
 * Add Search endpoints to the OpenAPI specification
 */
function addSearchProcedures(spec: OpenAPIV3.Document) {
  spec.paths['/search.create'] = {
    post: {
      summary: 'Create a new search request',
      description: 'Creates a new search request for the authenticated user',
      tags: ['Search'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['query', 'source'],
              properties: {
                query: { type: 'string', minLength: 1 },
                source: { type: 'string', minLength: 1 },
                filters: { type: 'object' },
                search_title: { type: 'string' },
                is_saved: { type: 'boolean', default: false },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Search request created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query_id: { type: 'string', format: 'uuid' },
                  user_id: { type: 'string' },
                  query: { type: 'string' },
                  source: { type: 'string' },
                  filters: { type: 'object', nullable: true },
                  timestamp: { type: 'string', format: 'date-time' },
                  search_title: { type: 'string', nullable: true },
                  is_saved: { type: 'boolean' },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
      },
    },
  };

  spec.paths['/search.getSavedSearches'] = {
    get: {
      summary: 'Get saved searches',
      description: 'Returns a list of saved search requests for the authenticated user',
      tags: ['Search'],
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Saved searches retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    query_id: { type: 'string', format: 'uuid' },
                    user_id: { type: 'string' },
                    query: { type: 'string' },
                    source: { type: 'string' },
                    filters: { type: 'object', nullable: true },
                    timestamp: { type: 'string', format: 'date-time' },
                    search_title: { type: 'string', nullable: true },
                    is_saved: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
      },
    },
  };
}

/**
 * Add Results endpoints to the OpenAPI specification
 */
function addResultsProcedures(spec: OpenAPIV3.Document) {
  spec.paths['/results.getByQueryId'] = {
    get: {
      summary: 'Get search results by query ID',
      description: 'Returns search results associated with the specified query ID',
      tags: ['Results'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'queryId',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'The ID of the search query',
        },
      ],
      responses: {
        '200': {
          description: 'Search results retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    query_id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    url: { type: 'string', format: 'uri' },
                    snippet: { type: 'string' },
                    source: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'Query not found',
        },
      },
    },
  };

  spec.paths['/results.saveResult'] = {
    post: {
      summary: 'Save a search result',
      description: 'Saves a search result associated with a query',
      tags: ['Results'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['query_id', 'title', 'url', 'snippet'],
              properties: {
                query_id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                snippet: { type: 'string' },
                source: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Search result saved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  query_id: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  snippet: { type: 'string' },
                  source: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
      },
    },
  };
}

/**
 * Add Review endpoints to the OpenAPI specification
 */
function addReviewProcedures(spec: OpenAPIV3.Document) {
  spec.paths['/review.tagResult'] = {
    post: {
      summary: 'Tag a search result',
      description: 'Adds a review tag to a search result',
      tags: ['Review'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['result_id', 'tag'],
              properties: {
                result_id: { type: 'string', format: 'uuid' },
                tag: { type: 'string', enum: ['include', 'exclude', 'maybe'] },
                exclusion_reason: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Search result tagged successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  result_id: { type: 'string', format: 'uuid' },
                  tag: { type: 'string' },
                  exclusion_reason: { type: 'string', nullable: true },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'Search result not found',
        },
      },
    },
  };

  spec.paths['/review.getTagsByQueryId'] = {
    get: {
      summary: 'Get review tags by query ID',
      description: 'Returns review tags for search results associated with the specified query ID',
      tags: ['Review'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'queryId',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'The ID of the search query',
        },
      ],
      responses: {
        '200': {
          description: 'Review tags retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    result_id: { type: 'string', format: 'uuid' },
                    tag: { type: 'string' },
                    exclusion_reason: { type: 'string', nullable: true },
                    created_at: { type: 'string', format: 'date-time' },
                    result: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        url: { type: 'string', format: 'uri' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
      },
    },
  };
} 