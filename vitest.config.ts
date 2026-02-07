import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.test.ts"],
        // Run test FILES sequentially to avoid DB conflicts
        fileParallelism: false,
        // Also run tests within files sequentially
        sequence: {
            concurrent: false,
        },
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
        },
        testTimeout: 30000, // 30s for integration tests
        // Set up environment for tests
        env: {
            SKIP_ENV_VALIDATION: "1",
            DATABASE_URL: "postgresql://postgres:password@localhost:5432/joanna",
            BACKBOARD_API_KEY: "test-api-key",
            JWT_SECRET: "test-jwt-secret-minimum-32-characters",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
