import { db } from "./db";
import * as schema from "./schema";
import * as t from "drizzle-orm";

async function create() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Insert 1 Project: Name it "Utilli Core App"
    // Remember to use .returning() to get the ID back!
    // YOUR CODE HERE
    const [newProject] = await db
      .insert(schema.projects)
      .values({ name: "Utilli Core App" })
      .returning();
    console.log(newProject.id);

    // 2. Insert 1 Test Suite: Name it "Authentication Flow"
    // Link it to the projectId you just created.
    // YOUR CODE HERE
    const [newTestSuite] = await db
      .insert(schema.testSuites)
      .values({ name: "Authentication Flow", projectId: newProject.id })
      .returning();
    console.log(newTestSuite.id);

    // 3. Insert 3 Test Cases (Link them all to the suiteId)
    // - Title: "User can log in", Status: "PASS", Priority: "HIGH"
    // - Title: "Password reset sends email", Status: "FAIL", Priority: "HIGH"
    // - Title: "UI buttons are blue", Status: "PENDING", Priority: "LOW"
    // YOUR CODE HERE
    await db.insert(schema.testCases).values([
      {
        title: "User can log in",
        status: "PASS",
        priority: "HIGH",
        suiteId: newTestSuite.id,
      },
      {
        title: "Password reset sends email",
        status: "FAIL",
        priority: "HIGH",
        suiteId: newTestSuite.id,
      },
      {
        title: "UI buttons are blue",
        status: "PENDING",
        priority: "LOW",
        suiteId: newTestSuite.id,
      },
    ]);

    console.log("✅ All test data inserted successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    process.exit(0); // This closes the connection when done
  }
}

async function get() {
  const projects = await db.select().from(schema.projects);
  console.log(projects);

  const testCasesWithHighPriority = await db
    .select()
    .from(schema.testCases)
    .where(t.eq(schema.testCases.priority, "HIGH"));
  console.log(testCasesWithHighPriority);

  const multiFilter = await db
    .select()
    .from(schema.testCases)
    .where(
      t.and(
        t.eq(schema.testCases.status, "FAIL"),
        t.eq(schema.testCases.priority, "HIGH"),
      ),
    );
  console.log(multiFilter);

  const searchFilter = await db
    .select()
    .from(schema.testCases)
    .where(t.like(schema.testCases.title, "%login%"));
  console.log(searchFilter);

  const limitedProjects = await db
    .select()
    .from(schema.projects)
    .orderBy(t.desc(schema.projects.id))
    .limit(2);
  console.log(limitedProjects);
}

async function upd() {
  const testCaseStatusUpdate = await db
    .update(schema.testCases)
    .set({ status: "PASS" })
    .where(t.eq(schema.testCases.id, 1));

  console.log(testCaseStatusUpdate);

  const testSuitesPriorityUpdate = await db
    .update(schema.testCases)
    .set({ priority: "LOW" })
    .where(t.eq(schema.testCases.suiteId, 1));
  console.log(testSuitesPriorityUpdate);
}

async function del() {
  const testCaseDelete = await db
    .delete(schema.testCases)
    .where(t.eq(schema.testCases.id, 2));
  console.log(testCaseDelete);

  const testCaseDeleteAll = await db
    .delete(schema.testCases)
    .where(t.eq(schema.testCases.status, "PASS"));
  console.log(testCaseDeleteAll);
}

async function injoin() {
  const injo = await db
    .select({
      testCaseTitle: schema.testCases.title,
      currentStatus: schema.testCases.status,
      priority: schema.testCases.priority,
      nameOfSuite: schema.testSuites.name,
      nameOfProject: schema.projects.name,
    })
    .from(schema.testCases)
    .innerJoin(
      schema.testSuites,
      t.eq(schema.testCases.suiteId, schema.testSuites.id),
    )
    .innerJoin(
      schema.projects,
      t.eq(schema.testSuites.projectId, schema.projects.id),
    )
    .where(t.eq(schema.testCases.priority, "HIGH"));
}

async function multi() {
  const details = await db
    .select()
    .from(schema.testCases)
    .innerJoin(
      schema.testSuites,
      t.eq(schema.testSuites.id, schema.testCases.suiteId),
    )
    .innerJoin(
      schema.projects,
      t.eq(schema.projects.id, schema.testSuites.projectId),
    )
    .where(
      t.and(
        t.or(
          t.eq(schema.testCases.status, "FAIL"),
          t.eq(schema.testCases.status, "PENDING"),
        ),
        t.eq(schema.testCases.priority, "HIGH"),
        t.eq(schema.projects.name, "Utilli Core App"),
      ),
    )
    

  console.log(details);
}

async function getTestCasesDynamic(filters: {
  status?: "PASS" | "FAIL" | "PENDING",
  priority?: "HIGH" | "LOW" | "MEDIUM",
  projectName?: string
}) {
  // 1. Create an array to hold our active filters
  const conditions = [];

  // 2. Check each field. If it exists, push a condition into the array.
  if (filters.status) {
    conditions.push(t.eq(schema.testCases.status, filters.status));
  }

  if (filters.priority) {
    conditions.push(t.eq(schema.testCases.priority, filters.priority));
  }

  if (filters.projectName) {
    conditions.push(t.eq(schema.projects.name, filters.projectName));
  }

  // 3. Execute the query
  const results = await db
    .select({
      testCaseTitle: schema.testCases.title,
      currentStatus: schema.testCases.status,
      priority: schema.testCases.priority,
      nameOfSuite: schema.testSuites.name,
      nameOfProject: schema.projects.name,
    })
    .from(schema.testCases)
    .innerJoin(
      schema.testSuites,
      t.eq(schema.testSuites.id, schema.testCases.suiteId),
    )
    .innerJoin(
      schema.projects,
      t.eq(schema.projects.id, schema.testSuites.projectId),
    )
    // THE SMART PART: Only apply t.and if we actually have conditions!
    .where(conditions.length > 0 ? t.and(...conditions) : undefined);

  console.log("--- Query Results ---");
  console.table(results);
}

// --- TEST CASES ---

// Scenario A: UI only sends Priority
console.log("Searching for HIGH priority only...");
await getTestCasesDynamic({ priority: "HIGH" });

// Scenario B: UI sends Status and Project Name
console.log("Searching for FAILED tests in 'Utilli Core App'...");
await getTestCasesDynamic({ status: "FAIL", projectName: "Utilli Core App" });

// Scenario C: UI sends nothing (returns all)
console.log("Searching with no filters...");
await getTestCasesDynamic({});

// multi();

// injoin();

// del();

// upd();

// get();

// create();
