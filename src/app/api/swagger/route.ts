import { NextResponse } from 'next/server';
import SwaggerUI from 'swagger-ui-express';
import { generateOpenApiSpec } from '@/server/api-docs';

/**
 * Generate OpenAPI documentation for the Grey Literature Search API
 */
export async function GET() {
  try {
    // Get the OpenAPI specification
    const openApiSpec = generateOpenApiSpec();

    // Generate HTML using swagger-ui-express
    const html = SwaggerUI.generateHTML(openApiSpec, {
      customSiteTitle: 'Grey Literature Search API Documentation',
    });

    // Return HTML response
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating Swagger documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
} 