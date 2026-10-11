process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.JWT_ACCESS_SECRET ??= "test-jwt-access-secret-that-is-at-least-32-characters";
process.env.PEPPER_SECRET ??= "test-pepper-secret-that-is-long-enough";
process.env.FRONTEND_ORIGINS ??= "http://localhost:4200";
