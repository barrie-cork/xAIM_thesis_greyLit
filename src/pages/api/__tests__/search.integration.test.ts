// src/pages/api/__tests__/search.integration.test.ts

import { vi } from 'vitest'; // Import vi first

// STEP 1: Define all mocks with vi.hoisted
const prismaMock = vi.hoisted(() => ({
  searchRequest: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const serpExecutorMock = vi.hoisted(() => ({
  execute: vi.fn(),
}));

const resultsProcessorMock = vi.hoisted(() => ({
  process: vi.fn(),
}));

// STEP 2: Apply mocks to modules
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

vi.mock('../../../lib/search/serp-executor.service', () => ({
  SerpExecutorService: vi.fn(() => serpExecutorMock),
}));

vi.mock('../../../lib/search/results-processor.service', () => ({
  ResultsProcessorService: vi.fn(() => resultsProcessorMock),
}));

// STEP 3: Import everything else after the mocks
import { beforeEach, describe, expect, it } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../search';

// Define custom response type
interface MockResponse extends NextApiResponse {
  _getJSONData: () => any;
}

describe('/api/search handler', () => {
  let req: NextApiRequest;
  let res: MockResponse;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup default mock return values
    prismaMock.searchRequest.create.mockResolvedValue({ 
      queryId: 'mock-id',
      query: 'test',
      filters: { status: 'pending' }
    });
    serpExecutorMock.execute.mockResolvedValue([]);
    resultsProcessorMock.process.mockResolvedValue({
      uniqueResults: [],
      duplicatesRemoved: 0,
      cacheHit: false,
    });

    // Set up request/response mocks
    const { req: mockReq, res: mockRes } = createMocks();
    req = mockReq as unknown as NextApiRequest;
    res = mockRes as unknown as MockResponse;
  });

  it('should return 405 if method is not POST', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res._getJSONData()).toEqual(
      expect.objectContaining({
        success: false,
        message: 'Method Not Allowed',
      })
    );
  });

  it('should return 400 if required fields are missing', async () => {
    req.method = 'POST';
    req.body = {}; // Missing required fields

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('required'),
      })
    );
  });

  it('should return 400 if numResults is invalid', async () => {
    req.method = 'POST';
    req.body = {
      query: 'test',
      numResults: -1, // Invalid number
      deduplication: true,
      useCache: true,
    };

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('numResults'),
      })
    );
  });

  it('should handle SERP execution errors gracefully', async () => {
    req.method = 'POST';
    req.body = {
      query: 'test query',
      numResults: 10,
      deduplication: true,
      useCache: true,
    };

    serpExecutorMock.execute.mockRejectedValueOnce(new Error('SERP API error'));

    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('search execution failed'),
      })
    );

    // Verify error was logged in searchRequest
    expect(prismaMock.searchRequest.update).toHaveBeenCalledWith({
      where: { queryId: 'mock-id' },
      data: { 
        filters: expect.objectContaining({
          status: 'error',
          error: expect.stringContaining('SERP API error')
        })
      }
    });
  });

  it('should return search results for valid POST request', async () => {
    // Setup request
    req.method = 'POST';
    req.body = {
      query: 'test query',
      numResults: 10,
      deduplication: true,
      useCache: true,
    };

    // Setup specific mock results for this test
    const mockApiResults = [
      { title: 'Test Result', url: 'https://example.com', snippet: 'This is a test result' },
    ];
    const mockApiProcessedResults = {
      uniqueResults: [
        {
          title: 'Test Result',
          url: 'https://example.com',
          snippet: 'This is a test result',
          metadata: { searchRequestId: 'mock-id' },
        },
      ],
      duplicatesRemoved: 0,
      cacheHit: false,
    };

    // Set specific return values for this test
    serpExecutorMock.execute.mockResolvedValueOnce(mockApiResults);
    resultsProcessorMock.process.mockResolvedValueOnce(mockApiProcessedResults);

    // Execute handler
    await handler(req, res);

    // Verify mock calls
    expect(prismaMock.searchRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          query: 'test query',
          filters: expect.objectContaining({
            status: 'pending',
            maxResults: 10
          })
        })
      })
    );
    expect(serpExecutorMock.execute).toHaveBeenCalledWith(expect.objectContaining({
      query: 'test query',
      maxResults: 10
    }));
    expect(resultsProcessorMock.process).toHaveBeenCalledWith(
      mockApiResults,
      expect.any(Object),
      expect.objectContaining({ searchRequestId: 'mock-id' })
    );

    // Verify the response
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual({
      success: true,
      data: mockApiProcessedResults.uniqueResults,
      metadata: {
        duplicatesRemoved: 0,
        cacheHit: false,
      },
    });

    // Verify final state update
    expect(prismaMock.searchRequest.update).toHaveBeenCalledWith({
      where: { queryId: 'mock-id' },
      data: { 
        filters: expect.objectContaining({
          status: 'completed',
          resultCount: 1,
          cacheHit: false,
          duplicatesRemoved: 0
        })
      }
    });
  });

  it('should handle results processing errors gracefully', async () => {
    req.method = 'POST';
    req.body = {
      query: 'test query',
      numResults: 10,
      deduplication: true,
      useCache: true,
    };

    const mockApiResults = [
      { title: 'Test Result', url: 'https://example.com', snippet: 'This is a test result' },
    ];

    serpExecutorMock.execute.mockResolvedValueOnce(mockApiResults);
    resultsProcessorMock.process.mockRejectedValueOnce(new Error('Processing error'));

    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('results processing failed'),
      })
    );

    // Verify error was logged in searchRequest
    expect(prismaMock.searchRequest.update).toHaveBeenCalledWith({
      where: { queryId: 'mock-id' },
      data: { 
        filters: expect.objectContaining({
          status: 'error',
          error: expect.stringContaining('Processing error')
        })
      }
    });
  });
}); 