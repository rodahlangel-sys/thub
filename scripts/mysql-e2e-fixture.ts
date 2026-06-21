import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import { assertMysqlE2ePrefix, parseFixtureMode } from "./mysql-e2e-core";

const fixturePath = path.join(process.cwd(), ".tmp", "mysql-e2e-current.json");
const imagePath = path.join(process.cwd(), ".tmp", "mysql-e2e-proof.png");

type Fixture = {
  prefix: string;
  password: string;
  adminEmail: string;
  parentEmail: string;
  tutorEmail: string;
  adminId: string;
};

function parseEnvValue(source: string, name: string) {
  const line = source.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
  if (!line) return undefined;
  const raw = line.slice(line.indexOf("=") + 1).trim();
  return raw.replace(/^['"]|['"]$/g, "");
}

async function openConnection() {
  const envFile = await readFile(
    path.join(process.cwd(), ".env.cloudbase.local"),
    "utf8",
  );
  const url = parseEnvValue(envFile, "CLOUDBASE_MYSQL_EXTERNAL_URL");
  if (!url) throw new Error("MYSQL_E2E_URL_MISSING");
  const parsed = new URL(url);
  if (parsed.protocol !== "mysql:" || parsed.pathname !== "/thub_test") {
    throw new Error("MYSQL_E2E_TARGET_INVALID");
  }
  const connection = await mysql.createConnection({ uri: url, timezone: "Z" });
  const [[identity]] = await connection.query<(RowDataPacket & { name: string })[]>(
    "SELECT DATABASE() AS name",
  );
  if (identity.name !== "thub_test") throw new Error("MYSQL_E2E_TARGET_INVALID");
  return connection;
}

function createPrefix() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .slice(0, 15);
  return assertMysqlE2ePrefix(
    `mysql_e2e_${stamp}_${randomBytes(3).toString("hex")}`,
  );
}

async function prepare(connection: Connection, apply: boolean) {
  try {
    await readFile(fixturePath, "utf8");
    throw new Error("MYSQL_E2E_FIXTURE_ALREADY_EXISTS");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", operation: "prepare", users: 1 }));
    return;
  }

  const prefix = createPrefix();
  const password = randomBytes(24).toString("base64url");
  const fixture: Fixture = {
    prefix,
    password,
    adminEmail: `${prefix}_admin@thub.invalid`.toLowerCase(),
    parentEmail: `${prefix}_parent@thub.invalid`.toLowerCase(),
    tutorEmail: `${prefix}_tutor@thub.invalid`.toLowerCase(),
    adminId: randomUUID(),
  };
  const passwordHash = await bcrypt.hash(password, 10);
  await connection.execute(
    `INSERT INTO \`User\`
      (id, email, passwordHash, role, name, phone, status, createdAt, updatedAt, termsAcceptedAt, privacyAcceptedAt)
     VALUES (?, ?, ?, 'ADMIN', ?, ?, 'ACTIVE', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [fixture.adminId, fixture.adminEmail, passwordHash, `${prefix}_admin`, "00000000000"],
  );

  await mkdir(path.dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, JSON.stringify(fixture), { encoding: "utf8", flag: "wx" });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await writeFile(imagePath, png, { flag: "wx" });
  console.log(
    JSON.stringify({
      mode: "apply",
      operation: "prepare",
      prefixHash: createHash("sha256").update(prefix).digest("hex"),
      usersCreated: 1,
      credentialFileIgnored: true,
      testImageCreated: true,
    }),
  );
}

function placeholders(values: unknown[]) {
  return values.map(() => "?").join(", ");
}

async function discoverCleanup(connection: Connection, fixture: Fixture) {
  assertMysqlE2ePrefix(fixture.prefix);
  const emails = [fixture.adminEmail, fixture.parentEmail, fixture.tutorEmail];
  const [users] = await connection.query<(RowDataPacket & { id: string })[]>(
    `SELECT id FROM \`User\` WHERE email IN (${placeholders(emails)})`,
    emails,
  );
  const userIds = users.map((row) => String(row.id));
  const queryIds = async (sql: string, params: unknown[]) => {
    const [rows] = await connection.query<(RowDataPacket & { id: string })[]>(sql, params);
    return rows.map((row) => String(row.id));
  };
  const parentProfileIds = userIds.length
    ? await queryIds(
        `SELECT id FROM \`ParentProfile\` WHERE userId IN (${placeholders(userIds)})`,
        userIds,
      )
    : [];
  const tutorProfileIds = userIds.length
    ? await queryIds(
        `SELECT id FROM \`TutorProfile\` WHERE userId IN (${placeholders(userIds)})`,
        userIds,
      )
    : [];
  const demandIds = userIds.length
    ? await queryIds(
        `SELECT id FROM \`Demand\` WHERE parentId IN (${placeholders(userIds)})`,
        userIds,
      )
    : [];
  const orderIds = userIds.length
    ? await queryIds(
        `SELECT id FROM \`Order\` WHERE parentId IN (${placeholders(userIds)}) OR tutorId IN (${placeholders(userIds)})`,
        [...userIds, ...userIds],
      )
    : [];
  const documentRows = tutorProfileIds.length
    ? await connection.query<
        (RowDataPacket & { id: string; storageKey: string })[]
      >(
        `SELECT id, storageKey FROM \`TutorVerificationDocument\` WHERE tutorProfileId IN (${placeholders(tutorProfileIds)})`,
        tutorProfileIds,
      ).then(([rows]) => rows)
    : [];
  const refundIds = orderIds.length
    ? await queryIds(
        `SELECT id FROM \`Refund\` WHERE orderId IN (${placeholders(orderIds)})`,
        orderIds,
      )
    : [];
  const entityIds = [
    ...userIds,
    ...parentProfileIds,
    ...tutorProfileIds,
    ...demandIds,
    ...orderIds,
    ...documentRows.map((row) => String(row.id)),
    ...refundIds,
  ];
  const [notifications] = await connection.query<
    (RowDataPacket & { id: string; userId: string; dedupeKey: string | null })[]
  >("SELECT id, userId, dedupeKey FROM `Notification`");
  const notificationIds = notifications
    .filter(
      (row) =>
        userIds.includes(String(row.userId)) ||
        (row.dedupeKey && entityIds.some((id) => row.dedupeKey!.includes(id))),
    )
    .map((row) => String(row.id));

  const childCount = async (table: string) => {
    if (!orderIds.length) return 0;
    const [[row]] = await connection.query<(RowDataPacket & { count: number })[]>(
      `SELECT COUNT(*) AS count FROM \`${table}\` WHERE orderId IN (${placeholders(orderIds)})`,
      orderIds,
    );
    return Number(row.count);
  };
  const counts = {
    User: userIds.length,
    ParentProfile: parentProfileIds.length,
    TutorProfile: tutorProfileIds.length,
    TutorVerificationDocument: documentRows.length,
    Demand: demandIds.length,
    Order: orderIds.length,
    Payment: await childCount("Payment"),
    Refund: await childCount("Refund"),
    LessonFeedback: await childCount("LessonFeedback"),
    Review: await childCount("Review"),
    Settlement: await childCount("Settlement"),
    Notification: notificationIds.length,
  };
  return {
    userIds,
    parentProfileIds,
    tutorProfileIds,
    demandIds,
    orderIds,
    documentRows,
    notificationIds,
    counts,
  };
}

async function deleteByIds(
  connection: Connection,
  table: string,
  field: string,
  ids: string[],
) {
  if (!ids.length) return;
  await connection.execute(
    `DELETE FROM \`${table}\` WHERE \`${field}\` IN (${placeholders(ids)})`,
    ids,
  );
}

async function cleanup(connection: Connection, apply: boolean) {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
  const discovered = await discoverCleanup(connection, fixture);
  if (!apply) {
    console.log(
      JSON.stringify({ mode: "dry-run", operation: "cleanup", counts: discovered.counts }),
    );
    return;
  }

  await connection.beginTransaction();
  try {
    await deleteByIds(connection, "Notification", "id", discovered.notificationIds);
    for (const table of ["Review", "LessonFeedback", "Refund", "Settlement", "Payment"]) {
      await deleteByIds(connection, table, "orderId", discovered.orderIds);
    }
    await deleteByIds(connection, "Order", "id", discovered.orderIds);
    await deleteByIds(connection, "Demand", "id", discovered.demandIds);
    await deleteByIds(
      connection,
      "TutorVerificationDocument",
      "tutorProfileId",
      discovered.tutorProfileIds,
    );
    await deleteByIds(connection, "ParentProfile", "id", discovered.parentProfileIds);
    await deleteByIds(connection, "TutorProfile", "id", discovered.tutorProfileIds);
    await deleteByIds(connection, "User", "id", discovered.userIds);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  for (const document of discovered.documentRows) {
    if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(document.storageKey)) {
      throw new Error("MYSQL_E2E_STORAGE_KEY_INVALID");
    }
    await unlink(
      path.join(process.cwd(), ".data", "tutor-verification", document.storageKey),
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  await unlink(imagePath).catch(() => undefined);
  await unlink(fixturePath);
  console.log(
    JSON.stringify({ mode: "apply", operation: "cleanup", deleted: discovered.counts }),
  );
}

async function inspect(connection: Connection) {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
  assertMysqlE2ePrefix(fixture.prefix);
  const emails = [fixture.adminEmail, fixture.parentEmail, fixture.tutorEmail];
  const [rows] = await connection.query<
    (RowDataPacket & {
      email: string;
      passwordHash: string;
      role: string;
      status: string;
    })[]
  >(
    `SELECT email, passwordHash, role, status FROM \`User\` WHERE email IN (${placeholders(emails)})`,
    emails,
  );
  const byEmail = new Map(rows.map((row) => [String(row.email), row]));
  const summary = await Promise.all(
    [
      ["admin", fixture.adminEmail, "ADMIN"],
      ["parent", fixture.parentEmail, "PARENT"],
      ["tutor", fixture.tutorEmail, "TUTOR"],
    ].map(async ([name, email, role]) => {
      const row = byEmail.get(email);
      return {
        name,
        exists: Boolean(row),
        roleCorrect: row?.role === role,
        active: row?.status === "ACTIVE",
        passwordMatches: row
          ? await bcrypt.compare(fixture.password, row.passwordHash)
          : false,
      };
    }),
  );
  console.log(JSON.stringify({ mode: "read-only", operation: "inspect", summary }));
}

async function normalizeEmails(connection: Connection, apply: boolean) {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
  assertMysqlE2ePrefix(fixture.prefix);
  const normalized = {
    ...fixture,
    adminEmail: fixture.adminEmail.toLowerCase(),
    parentEmail: fixture.parentEmail.toLowerCase(),
    tutorEmail: fixture.tutorEmail.toLowerCase(),
  };
  const changed =
    normalized.adminEmail !== fixture.adminEmail ||
    normalized.parentEmail !== fixture.parentEmail ||
    normalized.tutorEmail !== fixture.tutorEmail;
  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", operation: "normalize-emails", changed }));
    return;
  }
  await connection.execute("UPDATE `User` SET email = ? WHERE id = ? AND email = ?", [
    normalized.adminEmail,
    fixture.adminId,
    fixture.adminEmail,
  ]);
  await writeFile(fixturePath, JSON.stringify(normalized), "utf8");
  console.log(JSON.stringify({ mode: "apply", operation: "normalize-emails", changed }));
}

async function main() {
  const mode = parseFixtureMode(process.argv.slice(2));
  const connection = await openConnection();
  try {
    if (mode.operation === "prepare") await prepare(connection, mode.apply);
    else if (mode.operation === "cleanup") await cleanup(connection, mode.apply);
    else if (mode.operation === "inspect") await inspect(connection);
    else await normalizeEmails(connection, mode.apply);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({ ok: false, category: String((error as Error).message).split(":")[0] }),
  );
  process.exitCode = 1;
});
