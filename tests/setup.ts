// Provides a minimal valid environment so `getEnv()` doesn't throw during
// unit tests that don't touch a real database/redis/ollama instance.
process.env.DATABASE_URL ??= "postgresql://eduai:eduai_password@localhost:5432/eduai_test?schema=public";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-test-access-secret";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-test-refresh-secret";
process.env.JWT_ACCESS_EXPIRES_IN ??= "15m";
process.env.JWT_REFRESH_EXPIRES_IN ??= "7d";
