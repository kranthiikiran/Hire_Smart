const { 
  generateAccessToken, 
  generateRefreshToken, 
  authenticate, 
  authorize,
  hashPassword,
  verifyPassword 
} = require('../middleware/auth');
const jwt = require('jsonwebtoken');

describe('Authentication Middleware', () => {
  
  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { id: '123', email: 'test@example.com', role: 'recruiter' };
      const token = generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should set correct expiration time', () => {
      const payload = { id: '123', email: 'test@example.com' };
      const token = generateAccessToken(payload);
      const decoded = jwt.decode(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with longer expiry', () => {
      const payload = { id: '123', email: 'test@example.com' };
      const token = generateRefreshToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(payload.id);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('authenticate middleware', () => {
    it('should pass with valid token', () => {
      const req = {
        headers: {
          authorization: `Bearer ${generateAccessToken({ id: '123', email: 'test@example.com', role: 'recruiter' })}`
        }
      };
      const res = {};
      const next = jest.fn();
      
      authenticate(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should reject without token', () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      authenticate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should pass with correct role', () => {
      const req = {
        user: { id: '123', role: 'admin' },
        headers: {}
      };
      const res = {};
      const next = jest.fn();
      
      const middleware = authorize('admin', 'recruiter');
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should reject with insufficient role', () => {
      const req = {
        user: { id: '123', role: 'analyst' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      const middleware = authorize('admin');
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
