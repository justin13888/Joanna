
import { db } from "../server/db";
import { users } from "../server/db/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Seeding dummy user...");
    try {
        await db.insert(users).values({
            id: "00000000-0000-0000-0000-000000000000",
            email: "demo@example.com",
            passwordHash: "dummy",
        }).onConflictDoNothing();
        console.log("Done!");
    } catch (error) {
        console.error("Error seeding user:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
