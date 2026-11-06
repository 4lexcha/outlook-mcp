const { handleCheckAuthStatus } = require('../../auth/tools');
const TokenStorage = require('../../auth/token-storage');

jest.mock('../../auth/token-storage');

describe('auth/tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCheckAuthStatus', () => {
    it('returns "Authenticated and ready" when getValidAccessToken returns a token', async () => {
      const mockInstance = {
        getValidAccessToken: jest.fn().mockResolvedValue('valid_access_token')
      };
      TokenStorage.mockImplementation(() => mockInstance);

      const result = await handleCheckAuthStatus();

      expect(TokenStorage).toHaveBeenCalledTimes(1);
      expect(mockInstance.getValidAccessToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Authenticated and ready' }]
      });
    });

    it('returns "Not authenticated" when getValidAccessToken returns null', async () => {
      const mockInstance = {
        getValidAccessToken: jest.fn().mockResolvedValue(null)
      };
      TokenStorage.mockImplementation(() => mockInstance);

      const result = await handleCheckAuthStatus();

      expect(TokenStorage).toHaveBeenCalledTimes(1);
      expect(mockInstance.getValidAccessToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Not authenticated' }]
      });
    });

    // Case from PR #64, adapted to the unified single-call design (PR #72):
    // an expired cached token with a refresh token still yields "Authenticated and ready",
    // because getValidAccessToken refreshes internally.
    it('returns "Authenticated and ready" when the cached token is expired but refresh succeeds', async () => {
      const mockInstance = {
        getValidAccessToken: jest.fn().mockResolvedValue('refreshed-token')
      };
      TokenStorage.mockImplementation(() => mockInstance);

      const result = await handleCheckAuthStatus();

      expect(mockInstance.getValidAccessToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Authenticated and ready' }]
      });
    });
  });
});
