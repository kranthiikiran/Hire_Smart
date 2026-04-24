# Testing Guide

## Quick Start

### Install Dependencies
```bash
cd backend
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- auth.test.js
```

---

## Test Structure

```
backend/
├── middleware/
│   ├── auth.js
│   ├── validation.js
│   └── logging.js
├── services/
│   ├── batchProcessor.js
│   └── cacheManager.js
├── tests/
│   ├── setup.js                 # Global test setup
│   ├── auth.test.js             # Auth middleware tests
│   ├── validation.test.js       # Input validation tests
│   └── scoring.test.js          # AI scoring engine tests
└── jest.config.js               # Jest configuration
```

---

## Test Categories

### Unit Tests

#### Authentication Tests (`auth.test.js`)
- ✅ Token generation (access & refresh tokens)
- ✅ Password hashing & verification
- ✅ JWT middleware authentication
- ✅ Role-based authorization
- ✅ Token expiration handling

**Run:** `npm test -- auth.test.js`

```bash
# Example output
PASS  tests/auth.test.js
  Authentication Middleware
    generateAccessToken
      ✓ should generate a valid JWT token (5ms)
      ✓ should set correct expiration time (2ms)
    generateRefreshToken
      ✓ should generate a refresh token with longer expiry (3ms)
    hashPassword
      ✓ should hash a password successfully (124ms)
      ✓ should produce different hashes for the same password (234ms)
    authenticate middleware
      ✓ should pass with valid token (4ms)
      ✓ should reject without token (2ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

#### Input Validation Tests (`validation.test.js`)
- ✅ Job description validation (length, format)
- ✅ Resume upload validation (file type, size)
- ✅ Text sanitization (XSS, SQL injection prevention)
- ✅ Input normalization (spaces, encoding)

**Run:** `npm test -- validation.test.js`

#### Scoring Engine Tests (`scoring.test.js`)
- ✅ Skill matching algorithms
- ✅ Experience calculation
- ✅ Education scoring
- ✅ Final score computation
- ✅ Classification logic
- ✅ Custom weight configuration

**Run:** `npm test -- scoring.test.js`

---

## Running Tests

### Option 1: Run All Tests
```bash
npm test
```

### Option 2: Run with Coverage Report
```bash
npm run test:coverage
```

Output includes:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

Example:
```
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files      |   72.4  |   68.3   |   75.2  |   71.8  |
 middleware/   |   85.2  |   82.1   |   88.5  |   84.9  |
  auth.js      |   92.1  |   89.3   |   95.2  |   91.8  |
  validation.js|   78.3  |   74.5   |   81.2  |   77.9  | 45,67,89
```

### Option 3: Watch Mode (Auto-run on changes)
```bash
npm run test:watch
```

### Option 4: Run Single Test Suite
```bash
npm test -- auth.test.js
```

### Option 5: Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="authentication"
```

---

## Test Examples

### Example 1: Authentication Test
```javascript
it('should reject without token', () => {
  const req = { headers: {} };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  
  authenticate(req, res, next);
  
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
```

### Example 2: Validation Test
```javascript
it('should reject invalid file type', () => {
  const data = {
    originalname: 'resume.exe',
    mimetype: 'application/x-msdownload',
    size: 1024000
  };
  
  const { error } = resumeUploadSchema.validate(data);
  
  expect(error).toBeDefined();
});
```

### Example 3: Scoring Test
```javascript
it('should classify SUITABLE for high scores', () => {
  const result = engine.compute_final_score({
    semantic_score: 90,
    skills_score: 85,
    experience_score: 90,
    education_score: 85,
    cultural_fit_score: 80
  });
  
  expect(result.classification).toContain('SUITABLE');
});
```

---

## Coverage Requirements

Current minimum thresholds (in `jest.config.js`):

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50
  }
}
```

### Improve Coverage

1. **Run coverage report:**
   ```bash
   npm run test:coverage
   ```

2. **Identify gaps:**
   - Check `coverage/` directory for HTML report
   - Look for uncovered lines in summary

3. **Write additional tests:**
   - Add edge case tests
   - Test error conditions
   - Test boundary values

---

## Integration Testing

### Manual Integration Test Checklist

- [ ] **Auth Flow**
  - [ ] Login with correct credentials
  - [ ] Login with incorrect credentials
  - [ ] Protected endpoint with valid token
  - [ ] Protected endpoint without token
  - [ ] Protected endpoint with expired token

- [ ] **Analysis Flow**
  - [ ] Upload valid resume (PDF, DOCX, TXT)
  - [ ] Upload invalid file type
  - [ ] Upload oversized file
  - [ ] Analyze with full job description
  - [ ] Analyze with minimal job description

- [ ] **Batch Processing**
  - [ ] Queue batch job
  - [ ] Monitor batch status
  - [ ] Retrieve batch results
  - [ ] Handle concurrent batches

- [ ] **Caching**
  - [ ] First analysis (no cache)
  - [ ] Follow-up analysis (cache hit)
  - [ ] Cache invalidation

---

## Test Data

### Sample Resumes (in `sample_resumes/`)
- `resume_software_engineer.txt` - 5+ years backend experience
- `resume_data_scientist.txt` - 3+ years ML experience
- `resume_project_manager.txt` - 7+ years PM experience
- `resume_marketing_manager.txt` - 6+ years marketing experience
- `resume_ui_ux_designer.txt` - 4+ years design experience

### Sample Job Descriptions
```javascript
const jobDesc = {
  title: "Senior Backend Engineer",
  description: `
    We are seeking a Senior Backend Engineer with:
    - 5+ years of backend development experience
    - Proficiency in Python, Node.js, or Java
    - Experience with microservices architecture
    - Strong database design skills (SQL & NoSQL)
    - Experience with cloud platforms (AWS, GCP, Azure)
  `
};
```

---

## Debugging Tests

### Debug Single Test
```bash
node --inspect-brk node_modules/.bin/jest --runInBand auth.test.js
```

Then open `chrome://inspect` in Chrome DevTools.

### Verbose Output
```bash
npm test -- --verbose
```

### Show Detailed Error Messages
```bash
npm test -- --verbose --no-coverage
```

### Print Console Logs
```bash
npm test -- --verbose --no-coverage 2>&1 | grep -A 10 "Tests:"
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

---

## Performance Testing

### Measure Test Execution Time
```bash
npm test -- --verbose
```

Look for execution times in output:
```
✓ should generate a valid JWT token (5ms)
✓ should hash a password successfully (124ms)
```

### Slow Tests Alert
```bash
npm test -- --verbose --logHeapUsage
```

---

## Troubleshooting

### Issue: Tests Fail with "Cannot find module"
```bash
# Solution: Clear Jest cache
npm test -- --clearCache
```

### Issue: Redis Mock Not Working
```bash
# Solution: Check setup.js has mocked redis correctly
# Verify jest config includes setupFilesAfterEnv
```

### Issue: Tests Hang
```bash
# Solution: Increase timeout
npm test -- --testTimeout=10000
```

### Issue: Coverage Not Generated
```bash
# Solution: Ensure jest.config.js exists and is correct
npm test -- --coverage --coverageReporters=text
```

---

## Best Practices

1. **Test naming:** Use descriptive names
   ```javascript
   ✓ should hash a password successfully
   ✗ test password hash
   ```

2. **Arrange-Act-Assert Pattern:**
   ```javascript
   it('should validate correct data', () => {
     // Arrange
     const data = { email: 'test@example.com' };
     
     // Act
     const { error } = schema.validate(data);
     
     // Assert
     expect(error).toBeUndefined();
   });
   ```

3. **Mock External Services:**
   ```javascript
   jest.mock('redis');  // Already done in setup.js
   ```

4. **Test Edge Cases:**
   - Empty inputs
   - Null/undefined values
   - Very large values
   - Special characters

---

## Next Steps

- [ ] Add E2E tests with Supertest
- [ ] Add performance benchmarks
- [ ] Add security fuzzing tests
- [ ] Increase coverage to 80%+
- [ ] Add load testing with Artillery

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://jestjs.io/docs/testing-frameworks)
- [Mock Implementation](https://jestjs.io/docs/mock-functions)

---

**Last Updated:** January 2024
