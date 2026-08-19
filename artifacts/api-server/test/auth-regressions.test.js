import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { hashAccessCode } from "../src/lib/auth.ts";

process.env.NODE_ENV = "production";
process.env.SESSION_SECRET = "test-session-signing-secret";
process.env.ORGANIZER_ACCESS_CODE = "test-organizer-access-code";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/tagobtob_test";

const artifactDirectory = path.resolve(import.meta.dirname, "..");
const testBundleDirectory = await mkdtemp(
  path.join(tmpdir(), "tagobtob-api-tests-"),
);
const testBundlePath = path.join(testBundleDirectory, "app.mjs");
const validScore = {
  category: "group",
  schoolCode: "01",
  rawCriterion1: 48,
  rawCriterion2: 19,
  rawCriterion3: 29,
  deductionCount: 0,
};

let createApp;
let httpServer;
let baseUrl;
let fixture;

function createFakeDatabase() {
  const judges = [
    {
      id: 1,
      name: "Judge One",
      accessCodeHash: hashAccessCode("judge-one-test-code"),
      accessCodeVersion: 1,
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
    },
    {
      id: 2,
      name: "Judge Two",
      accessCodeHash: hashAccessCode("judge-two-test-code"),
      accessCodeVersion: 1,
      createdAt: new Date("2026-08-19T00:00:01.000Z"),
    },
    {
      id: 3,
      name: "Judge Three",
      accessCodeHash: hashAccessCode("judge-three-test-code"),
      accessCodeVersion: 1,
      createdAt: new Date("2026-08-19T00:00:02.000Z"),
    },
  ];
  const scores = [];

  const database = {
    scores,
    select(fields) {
      const isJudgeSessionLookup = fields && "accessCodeHash" in fields;
      const isRosterLookup =
        fields && "name" in fields && "accessCodeVersion" in fields;
      const records = isJudgeSessionLookup || isRosterLookup ? judges : scores;

      return {
        from() {
          return {
            orderBy: async () => records.map((record) => ({ ...record })),
            where() {
              return {
                limit: async (limit) =>
                  records.slice(0, limit).map((record) => ({ ...record })),
                orderBy: async () => records.map((record) => ({ ...record })),
              };
            },
          };
        },
      };
    },
    update() {
      return {
        set() {
          return {
            where() {
              return {
                returning: async () => {
                  const judge = judges[0];
                  judge.accessCodeHash = hashAccessCode(
                    "reset-judge-one-test-code",
                  );
                  judge.accessCodeVersion += 1;
                  return [{ ...judge }];
                },
              };
            },
          };
        },
      };
    },
    insert() {
      return {
        values(values) {
          return {
            returning: async () => {
              const score = {
                id: scores.length + 1,
                ...values,
                createdAt: new Date("2026-08-19T00:00:03.000Z"),
              };
              scores.push(score);
              return [score];
            },
          };
        },
      };
    },
    delete() {
      throw new Error("An unauthorized request must not reach score deletion.");
    },
    transaction() {
      throw new Error(
        "An unauthorized request must not reach judge management.",
      );
    },
  };

  return database;
}

async function request(pathname, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, body: await response.json() };
}

function sessionCookie(response) {
  const [cookie] = response.headers.getSetCookie();
  assert.ok(cookie, "a successful sign-in should set a session cookie");
  return cookie.split(";", 1)[0];
}

async function signInJudge() {
  const { response, body } = await request("/api/auth/judge-sessions", {
    method: "POST",
    body: { judgeId: 1, accessCode: "judge-one-test-code" },
  });
  assert.equal(response.status, 201);
  assert.deepEqual(body, { role: "judge", judgeId: 1 });
  return sessionCookie(response);
}

async function signInOrganizer() {
  const { response, body } = await request("/api/auth/organizer-sessions", {
    method: "POST",
    body: { accessCode: "test-organizer-access-code" },
  });
  assert.equal(response.status, 201);
  assert.deepEqual(body, { role: "organizer", judgeId: null });
  return sessionCookie(response);
}

before(async () => {
  await build({
    entryPoints: [path.join(artifactDirectory, "src/app.ts")],
    outfile: testBundlePath,
    bundle: true,
    platform: "node",
    format: "esm",
    banner: {
      js: `import { createRequire as __bannerCrReq } from "node:module";
import __bannerPath from "node:path";
import __bannerUrl from "node:url";

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);`,
    },
  });
  ({ createApp } = await import(pathToFileURL(testBundlePath).href));
});

beforeEach(async () => {
  fixture = createFakeDatabase();
  httpServer = createApp(fixture).listen(0, "127.0.0.1");
  await new Promise((resolve) => httpServer.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    httpServer.close((error) => (error ? reject(error) : resolve()));
  });
});

after(async () => {
  await rm(testBundleDirectory, { recursive: true, force: true });
});

test("blocks anonymous callers from every score and judge management action", async () => {
  const cases = [
    ["/api/scores", "POST", { ...validScore, judgeId: 2 }, 401],
    ["/api/judges", "POST", { name: "Unauthorized judge" }, 403],
    ["/api/judges/1", "DELETE", undefined, 403],
    ["/api/judges/1/access-code", "POST", undefined, 403],
    ["/api/scores/1", "DELETE", undefined, 403],
  ];

  for (const [pathname, method, body, expectedStatus] of cases) {
    const result = await request(pathname, { method, body });
    assert.equal(
      result.response.status,
      expectedStatus,
      `${method} ${pathname}`,
    );
    assert.equal(typeof result.body.error, "string");
  }
});

test("uses the signed judge session instead of caller-supplied score identity fields", async () => {
  const judgeCookie = await signInJudge();
  const { response, body } = await request("/api/scores", {
    method: "POST",
    cookie: judgeCookie,
    body: {
      ...validScore,
      judgeId: 2,
      judgeName: "Impersonated Judge",
    },
  });

  assert.equal(response.status, 201);
  assert.equal(body.judgeId, 1);
  assert.equal(body.judgeName, "Judge One");
  assert.equal(fixture.scores.length, 1);
  assert.equal(fixture.scores[0].judgeId, 1);
  assert.equal(fixture.scores[0].judgeName, "Judge One");
});

test("invalid access-code responses are generic and never create a session", async () => {
  const attempts = [
    [
      "/api/auth/organizer-sessions",
      { accessCode: "incorrect-organizer-code" },
    ],
    [
      "/api/auth/judge-sessions",
      { judgeId: 1, accessCode: "incorrect-judge-code" },
    ],
  ];

  for (const [pathname, body] of attempts) {
    const { response, body: responseBody } = await request(pathname, {
      method: "POST",
      body,
    });
    assert.equal(response.status, 401, pathname);
    assert.equal(typeof responseBody.error, "string");
    assert.ok(!responseBody.error.includes("test-organizer-access-code"));
    assert.ok(!responseBody.error.includes("judge-one-test-code"));
    assert.equal(response.headers.getSetCookie().length, 0);
  }
});

test("resetting an access code immediately invalidates the existing judge session", async () => {
  const judgeCookie = await signInJudge();
  const organizerCookie = await signInOrganizer();
  const reset = await request("/api/judges/1/access-code", {
    method: "POST",
    cookie: organizerCookie,
  });

  assert.equal(reset.response.status, 200);
  assert.equal(reset.body.id, 1);
  assert.equal(reset.body.hasAccessCode, true);

  const { response, body } = await request("/api/scores", {
    method: "POST",
    cookie: judgeCookie,
    body: { ...validScore, schoolCode: "02" },
  });

  assert.equal(response.status, 401);
  assert.match(body.error, /no longer valid/i);
  assert.equal(fixture.scores.length, 0);
});
