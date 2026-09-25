import { sendSuccess, sendError, paginateMeta } from '../utils/response';

describe('Standard API Response Envelope', () => {
  let mockRes: any;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('formats success responses with success: true and data payload', () => {
    const data = { id: 'station-123', name: 'Maitri Station' };
    sendSuccess(mockRes, data, 200);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data,
    });
  });

  it('includes optional metadata in success response when provided', () => {
    const data = [{ id: 'item-1' }, { id: 'item-2' }];
    const meta = paginateMeta(50, 1, 20);
    sendSuccess(mockRes, data, 200, meta);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data,
      meta: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    });
  });

  it('formats error responses with success: false and standard error code', () => {
    sendError(mockRes, 'NOT_FOUND', 'Item not found in station inventory', 404);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Item not found in station inventory',
      },
    });
  });
});
