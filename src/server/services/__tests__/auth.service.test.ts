/**
 * AuthService Integration Tests
 *
 * Tests the auth service with a real database connection.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { AuthService } from "../auth.service";
import {
    createTestDb,
    cleanupTestData,
    testEmail,
    testPassword,
} from "./test-utils";

describe("AuthService", () => {
    const db = createTestDb();
    const jwtSecret = "test-jwt-secret-minimum-32-characters";
    let authService: AuthService;

    beforeAll(() => {
        authService = new AuthService(db, jwtSecret);
    });

    beforeEach(async () => {
        await cleanupTestData(db);
    });

    afterAll(async () => {
        await cleanupTestData(db);
    });

    describe("register", () => {
        it("should register a new user successfully", async () => {
            const email = testEmail();
            const password = testPassword();

            const result = await authService.register({ email, password });

            expect(result.user.email).toBe(email);
            expect(result.user.id).toBeDefined();
            expect(result.token).toBeDefined();
        });

        it("should throw an error if user already exists", async () => {
            const email = testEmail();
            const password = testPassword();

            await authService.register({ email, password });

            await expect(
                authService.register({ email, password }),
            ).rejects.toThrow("User already exists");
        });
    });

    describe("login", () => {
        it("should login with valid credentials", async () => {
            const email = testEmail();
            const password = testPassword();

            await authService.register({ email, password });
            const result = await authService.login({ email, password });

            expect(result.user.email).toBe(email);
            expect(result.token).toBeDefined();
        });

        it("should throw an error with invalid email", async () => {
            await expect(
                authService.login({ email: "nonexistent@test.com", password: "test" }),
            ).rejects.toThrow("Invalid credentials");
        });

        it("should throw an error with invalid password", async () => {
            const email = testEmail();
            const password = testPassword();

            await authService.register({ email, password });

            await expect(
                authService.login({ email, password: "wrongpassword" }),
            ).rejects.toThrow("Invalid credentials");
        });
    });

    describe("verifyToken", () => {
        it("should verify a valid token", async () => {
            const email = testEmail();
            const password = testPassword();

            const { token, user } = await authService.register({ email, password });
            const payload = authService.verifyToken(token);

            expect(payload.userId).toBe(user.id);
            expect(payload.email).toBe(email);
        });

        it("should throw an error for invalid token", () => {
            expect(() => authService.verifyToken("invalid-token")).toThrow(
                "Invalid token",
            );
        });
    });

    describe("getUserById", () => {
        it("should return user by ID", async () => {
            const email = testEmail();
            const password = testPassword();

            const { user } = await authService.register({ email, password });
            const foundUser = await authService.getUserById(user.id);

            expect(foundUser?.email).toBe(email);
        });

        it("should return null for non-existent user", async () => {
            const foundUser = await authService.getUserById(
                "00000000-0000-0000-0000-000000000000",
            );
            expect(foundUser).toBeNull();
        });
    });
});
