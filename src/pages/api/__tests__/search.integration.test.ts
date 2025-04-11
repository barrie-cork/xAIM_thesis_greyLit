// src/pages/api/__tests__/search.integration.test.ts

import { vi } from 'vitest'; // Import vi first

// STEP 1: Define all mocks with vi.hoisted
const prismaMock = vi.hoisted(() => ({
  searchRequest: {
    create: vi.fn(),
  },
  // Add other potentially used Prisma methods if needed, or use mockDeep
  // $connect: vi.fn(),
  // $disconnect: vi.fn(),
}));

const serpExecutorMock = vi.hoisted(() => ({
  execute: vi.fn(),
}));

const resultsProcessorMock = vi.hoisted(() => ({
  process: vi.fn(),
}));

// STEP 2: Apply mocks to modules
vi.mock('@prisma/client', () => ({
  // __esModule: true, // May or may not be needed depending on module format
  PrismaClient: vi.fn(() => prismaMock),
}));

vi.mock('../../../lib/search/serp-executor.service', () => ({
  // __esModule: true,
  SerpExecutorService: vi.fn(() => serpExecutorMock),
}));

vi.mock('../../../lib/search/results-processor.service', () => ({
  // __esModule: true,
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
    // If using jest-mock-extended's mockDeep, use mockReset(prismaMock)

    // Setup default mock return values
    prismaMock.searchRequest.create.mockResolvedValue({ queryId: 'mock-id' });
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
    expect(prismaMock.searchRequest.create).toHaveBeenCalled();
    expect(serpExecutorMock.execute).toHaveBeenCalledWith(req.body);
    expect(resultsProcessorMock.process).toHaveBeenCalledWith(
      mockApiResults,
      req.body,
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
  });
}); 