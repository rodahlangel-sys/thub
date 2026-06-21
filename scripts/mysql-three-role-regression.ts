import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import { assertMysqlE2ePrefix } from "./mysql-e2e-core";

const baseUrl = "http://127.0.0.1:3000";
const fixturePath = path.join(process.cwd(), ".tmp", "mysql-e2e-current.json");
const imagePath = path.join(process.cwd(), ".tmp", "mysql-e2e-proof.png");

type Fixture = {
  prefix: string;
  password: string;
  adminEmail: string;
  parentEmail: string;
  tutorEmail: string;
};

function parseEnvValue(source: string, name: string) {
  const line = source.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
}

async function openConnection() {
  const env = await readFile(path.join(process.cwd(), ".env.cloudbase.local"), "utf8");
  const url = parseEnvValue(env, "CLOUDBASE_MYSQL_EXTERNAL_URL");
  if (!url || new URL(url).pathname !== "/thub_test") throw new Error("MYSQL_E2E_TARGET_INVALID");
  return mysql.createConnection({ uri: url, timezone: "Z" });
}

function actionIds(html: string, field: string) {
  return Array.from(html.matchAll(/<form\b[\s\S]*?<\/form>/gi), (match) => match[0])
    .filter((form) => new RegExp(`name=["']${field}["']`, "i").test(form))
    .map((form) => form.match(/name=["'](\$ACTION_[^"']+)["']/i)?.[1])
    .filter((value): value is string => Boolean(value));
}

class HttpSession {
  private cookie = "";

  clearCookies() {
    this.cookie = "";
  }

  private updateCookies(response: Response) {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = headers.getSetCookie?.() ?? [];
    for (const item of setCookies) {
      const pair = item.split(";", 1)[0];
      const name = pair.slice(0, pair.indexOf("="));
      const current = new Map(
        this.cookie
          .split("; ")
          .filter(Boolean)
          .map((entry) => [entry.slice(0, entry.indexOf("=")), entry]),
      );
      current.set(name, pair);
      this.cookie = Array.from(current.values()).join("; ");
    }
  }

  async get(route: string, redirect: RequestRedirect = "follow") {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: this.cookie ? { cookie: this.cookie } : undefined,
      redirect,
    });
    this.updateCookies(response);
    return response;
  }

  async postAction(
    route: string,
    anchorField: string,
    fields: Record<string, string>,
    options?: { occurrence?: number; file?: { field: string; path: string } },
  ) {
    const page = await this.get(route);
    if (!page.ok) throw new Error(`PAGE_GET_FAILED:${route}:${page.status}`);
    const ids = actionIds(await page.text(), anchorField);
    const actionId = ids[options?.occurrence ?? 0];
    if (!actionId) throw new Error(`SERVER_ACTION_NOT_FOUND:${route}:${anchorField}`);
    return this.postKnownAction(route, actionId, fields, options?.file);
  }

  async postKnownAction(
    route: string,
    actionId: string,
    fields: Record<string, string>,
    file?: { field: string; path: string },
  ) {
    const body = new FormData();
    body.set(actionId, "");
    for (const [name, value] of Object.entries(fields)) body.set(name, value);
    if (file) {
      const buffer = await readFile(file.path);
      body.set(file.field, new File([buffer], "mysql-e2e-proof.png", { type: "image/png" }));
    }
    const response = await fetch(`${baseUrl}${route}`, {
      method: "POST",
      body,
      redirect: "manual",
      headers: {
        ...(this.cookie ? { cookie: this.cookie } : {}),
        origin: baseUrl,
        referer: `${baseUrl}${route}`,
      },
    });
    this.updateCookies(response);
    const location = response.headers.get("location") ?? "";
    if (location.includes("error=")) throw new Error(`SERVER_ACTION_ERROR:${route}`);
    if (![200, 303, 307].includes(response.status)) {
      throw new Error(`SERVER_ACTION_STATUS:${route}:${response.status}`);
    }
    return { status: response.status, location, actionId };
  }
}

async function one<T extends RowDataPacket>(
  connection: Connection,
  sql: string,
  params: unknown[],
) {
  const [rows] = await connection.query<T[]>(sql, params);
  if (rows.length !== 1) throw new Error("MYSQL_E2E_EXPECTED_ONE_ROW");
  return rows[0];
}

async function scalar(
  connection: Connection,
  sql: string,
  params: unknown[] = [],
) {
  const row = await one<RowDataPacket & { value: number }>(connection, sql, params);
  return Number(row.value);
}

async function expectServerActionRejection(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    if (String((error as Error).message).startsWith("SERVER_ACTION_ERROR:")) return;
    throw error;
  }
  throw new Error("EXPECTED_SERVER_ACTION_REJECTION_MISSING");
}

async function main() {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
  fixture.adminEmail = fixture.adminEmail.toLowerCase();
  fixture.parentEmail = fixture.parentEmail.toLowerCase();
  fixture.tutorEmail = fixture.tutorEmail.toLowerCase();
  assertMysqlE2ePrefix(fixture.prefix);
  const connection = await openConnection();
  const parent = new HttpSession();
  const tutor = new HttpSession();
  const admin = new HttpSession();

  try {
    const register = async (session: HttpSession, role: "PARENT" | "TUTOR", email: string) => {
      const exists = await scalar(
        connection,
        "SELECT COUNT(*) AS value FROM `User` WHERE email = ? AND role = ?",
        [email, role],
      );
      const result = exists
        ? await session.postAction("/login", "password", {
            email,
            password: fixture.password,
          })
        : await session.postAction("/register", "policyAccepted", {
            name: `${fixture.prefix}_${role.toLowerCase()}`,
            phone: "00000000000",
            email,
            password: fixture.password,
            confirmPassword: fixture.password,
            role,
            policyAccepted: "on",
          });
      if (result.location !== (role === "PARENT" ? "/parent" : "/tutor")) {
        throw new Error("REGISTRATION_REDIRECT_INVALID");
      }
    };
    await register(parent, "PARENT", fixture.parentEmail);
    await register(tutor, "TUTOR", fixture.tutorEmail);
    const adminLogin = await admin.postAction("/login", "password", {
      email: fixture.adminEmail,
      password: fixture.password,
    });
    if (adminLogin.location !== "/admin") throw new Error("ADMIN_LOGIN_FAILED");

    const parentUser = await one<RowDataPacket & { id: string }>(
      connection,
      "SELECT id FROM `User` WHERE email = ? AND role = 'PARENT'",
      [fixture.parentEmail],
    );
    const tutorUser = await one<RowDataPacket & { id: string }>(
      connection,
      "SELECT id FROM `User` WHERE email = ? AND role = 'TUTOR'",
      [fixture.tutorEmail],
    );
    await connection.execute("UPDATE `User` SET status = 'DISABLED' WHERE id = ?", [
      parentUser.id,
    ]);
    const disabledResponse = await parent.get("/parent", "manual");
    if (disabledResponse.status !== 307 || disabledResponse.headers.get("location") !== "/login") {
      throw new Error("DISABLED_SESSION_NOT_BLOCKED");
    }
    await connection.execute("UPDATE `User` SET status = 'ACTIVE' WHERE id = ?", [
      parentUser.id,
    ]);
    parent.clearCookies();
    await parent.postAction("/login", "password", {
      email: fixture.parentEmail,
      password: fixture.password,
    });

    await parent.postAction("/parent/profile", "area", {
      area: "E2E_AREA",
      addressDetail: "E2E_ADDRESS",
      childInfo: "E2E_CHILD",
    });
    await tutor.postAction(
      "/tutor/profile",
      "document",
      { documentType: "ENROLLMENT_PROOF", documentId: "" },
      { file: { field: "document", path: imagePath } },
    );
    await tutor.postAction("/tutor/profile", "school", {
      school: "E2E_UNIVERSITY",
      major: "E2E_MAJOR",
      grade: "E2E_GRADE",
      gender: "E2E_GENDER",
      subjects: "数学",
      teachLevels: "高中",
      areas: "E2E_AREA",
      teachMode: "BOTH",
      availableTimes: "周末",
      priceMin: "100",
      priceMax: "120",
      introduction: "MySQL E2E tutor introduction",
      experience: "MySQL E2E tutor experience",
    });

    const tutorProfile = await one<
      RowDataPacket & { id: string; certificationStatus: string }
    >(connection, "SELECT id, certificationStatus FROM `TutorProfile` WHERE userId = ?", [
      tutorUser.id,
    ]);
    if (tutorProfile.certificationStatus !== "PENDING") throw new Error("TUTOR_NOT_PENDING");
    const document = await one<RowDataPacket & { id: string; status: string }>(
      connection,
      "SELECT id, status FROM `TutorVerificationDocument` WHERE tutorProfileId = ?",
      [tutorProfile.id],
    );
    if (document.status !== "SUBMITTED") throw new Error("DOCUMENT_NOT_SUBMITTED");

    const parentDocument = await parent.get(`/api/tutor-documents/${document.id}`, "manual");
    if (parentDocument.status !== 404) throw new Error("DOCUMENT_PERMISSION_FAILED");
    if (!(await tutor.get(`/api/tutor-documents/${document.id}`)).ok) {
      throw new Error("TUTOR_DOCUMENT_READ_FAILED");
    }
    if (!(await admin.get(`/api/tutor-documents/${document.id}`)).ok) {
      throw new Error("ADMIN_DOCUMENT_READ_FAILED");
    }

    const approvePage = `/admin/tutors/${tutorProfile.id}`;
    const approve = await admin.postAction(approvePage, "tutorProfileId", {
      tutorProfileId: tutorProfile.id,
    });
    const approvalNotificationCount = await scalar(
      connection,
      "SELECT COUNT(*) AS value FROM `Notification` WHERE userId = ? AND type = 'AUDIT'",
      [tutorUser.id],
    );
    await expectServerActionRejection(() =>
      admin.postKnownAction(approvePage, approve.actionId, {
        tutorProfileId: tutorProfile.id,
      }),
    );
    if (
      (await scalar(
        connection,
        "SELECT COUNT(*) AS value FROM `Notification` WHERE userId = ? AND type = 'AUDIT'",
        [tutorUser.id],
      )) !== approvalNotificationCount
    ) {
      throw new Error("DUPLICATE_AUDIT_NOTIFICATION");
    }

    try {
      await connection.execute(
        `INSERT INTO \`TutorVerificationDocument\`
          (id, tutorProfileId, type, storageKey, originalName, mimeType, sizeBytes, status, createdAt, updatedAt)
         VALUES (?, ?, 'STUDENT_CARD', ?, 'e2e.png', 'image/png', 1, 'SUBMITTED', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [`${fixture.prefix}_constraint`, tutorProfile.id, `${fixture.prefix}.png`],
      );
      throw new Error("ACTIVE_PROOF_CONSTRAINT_NOT_ENFORCED");
    } catch (error) {
      if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    }

    const createDemand = async (subject: string) => {
      await parent.postAction("/parent/demands/new", "childGrade", {
        childGrade: "高中",
        subject,
        goal: "E2E_GOAL",
        area: "E2E_AREA",
        teachMode: "ONLINE",
        expectedTime: "周末",
        budgetMin: "100",
        budgetMax: "150",
        description: `${fixture.prefix}_${subject}`,
      });
      const row = await one<RowDataPacket & { id: string }>(
        connection,
        "SELECT id FROM `Demand` WHERE parentId = ? AND subject = ? ORDER BY createdAt DESC LIMIT 1",
        [parentUser.id, subject],
      );
      return row.id;
    };
    const demandOne = await createDemand("E2E_ORDER_ONE");
    const demandTwo = await createDemand("E2E_ORDER_TWO");

    const createOrder = async (demandId: string, subject: string) => {
      const route = `/parent/demands/${demandId}/book/${tutorProfile.id}`;
      const fields = {
        demandId,
        tutorProfileId: tutorProfile.id,
        subject,
        scheduledTime: "2026-07-01 14:00",
        teachMode: "ONLINE",
        location: "ONLINE",
        hours: "2",
      };
      const first = await parent.postAction(route, "scheduledTime", fields);
      await expectServerActionRejection(() =>
        parent.postKnownAction(route, first.actionId, fields),
      );
      const count = await scalar(
        connection,
        "SELECT COUNT(*) AS value FROM `Order` WHERE demandId = ? AND tutorId = ?",
        [demandId, tutorUser.id],
      );
      if (count !== 1) throw new Error("DUPLICATE_BOOKING_PROTECTION_FAILED");
      return one<
        RowDataPacket & {
          id: string;
          hourlyPrice: number;
          totalAmount: number;
          platformFeeRateBps: number;
          platformFeeAmountFen: number;
          tutorNetAmountFen: number;
        }
      >(
        connection,
        "SELECT id, hourlyPrice, totalAmount, platformFeeRateBps, platformFeeAmountFen, tutorNetAmountFen FROM `Order` WHERE demandId = ? AND tutorId = ?",
        [demandId, tutorUser.id],
      );
    };
    const orderOne = await createOrder(demandOne, "E2E_ORDER_ONE");
    const orderTwo = await createOrder(demandTwo, "E2E_ORDER_TWO");
    for (const order of [orderOne, orderTwo]) {
      if (
        order.totalAmount !== order.hourlyPrice * 2 ||
        order.platformFeeRateBps !== 500 ||
        order.platformFeeAmountFen !== Math.round(order.totalAmount * 0.05) ||
        order.tutorNetAmountFen !== order.totalAmount - order.platformFeeAmountFen
      ) {
        throw new Error("SERVER_AMOUNT_SNAPSHOT_FAILED");
      }
      await tutor.postAction(`/tutor/orders/${order.id}`, "orderId", { orderId: order.id });
      const earlyFeedback = await tutor.get(`/tutor/orders/${order.id}/feedback`, "manual");
      const earlyAction = actionIds(await earlyFeedback.text(), "content")[0];
      if (earlyFeedback.status !== 200 || !earlyAction) {
        throw new Error("EARLY_FEEDBACK_FORM_INVALID");
      }
      await expectServerActionRejection(() =>
        tutor.postKnownAction(`/tutor/orders/${order.id}/feedback`, earlyAction, {
          orderId: order.id,
          content: "E2E_EARLY_CONTENT",
          studentPerformance: "E2E_EARLY_PERFORMANCE",
          problems: "E2E_EARLY_PROBLEMS",
          nextSuggestion: "E2E_EARLY_NEXT",
        }),
      );
      await parent.postAction(`/parent/orders/${order.id}/pay`, "orderId", {
        orderId: order.id,
      });
    }

    await tutor.postAction(`/tutor/orders/${orderOne.id}`, "orderId", {
      orderId: orderOne.id,
    });
    const feedbackRoute = `/tutor/orders/${orderOne.id}/feedback`;
    const feedbackHtml = await (await tutor.get(feedbackRoute)).text();
    const feedbackAction = actionIds(feedbackHtml, "content")[0];
    if (!feedbackAction) throw new Error("FEEDBACK_ACTION_NOT_FOUND");
    await expectServerActionRejection(() =>
      tutor.postKnownAction(`/tutor/orders/${orderTwo.id}/feedback`, feedbackAction, {
        orderId: orderTwo.id,
        content: "E2E_EARLY_CONTENT",
        studentPerformance: "E2E_EARLY_PERFORMANCE",
        problems: "E2E_EARLY_PROBLEMS",
        nextSuggestion: "E2E_EARLY_NEXT",
      }),
    );
    await tutor.postKnownAction(feedbackRoute, feedbackAction, {
      orderId: orderOne.id,
      content: "E2E_CONTENT",
      studentPerformance: "E2E_PERFORMANCE",
      problems: "E2E_PROBLEMS",
      nextSuggestion: "E2E_NEXT",
    });
    const completionPage = `/parent/orders/${orderOne.id}`;
    const completionHtml = await (await parent.get(completionPage)).text();
    const completionAction = actionIds(completionHtml, "orderId")[0];
    if (!completionAction) throw new Error("COMPLETION_ACTION_NOT_FOUND");
    await parent.postKnownAction(completionPage, completionAction, { orderId: orderOne.id });
    await expectServerActionRejection(() =>
      parent.postKnownAction(completionPage, completionAction, { orderId: orderOne.id }),
    );
    await parent.postAction(`/parent/orders/${orderOne.id}/review`, "comment", {
      orderId: orderOne.id,
      scorePunctuality: "5",
      scoreClarity: "5",
      scoreCommunication: "5",
      scoreAcceptance: "5",
      comment: "E2E_REVIEW",
    });

    const settlement = await one<
      RowDataPacket & {
        grossAmountFen: number;
        platformFeeRateBps: number;
        platformFeeAmountFen: number;
        tutorNetAmountFen: number;
      }
    >(
      connection,
      "SELECT grossAmountFen, platformFeeRateBps, platformFeeAmountFen, tutorNetAmountFen FROM `Settlement` WHERE orderId = ?",
      [orderOne.id],
    );
    if (
      settlement.grossAmountFen !== orderOne.totalAmount ||
      settlement.platformFeeRateBps !== 500 ||
      settlement.platformFeeAmountFen + settlement.tutorNetAmountFen !==
        settlement.grossAmountFen ||
      (await scalar(
        connection,
        "SELECT COUNT(*) AS value FROM `Settlement` WHERE orderId = ?",
        [orderOne.id],
      )) !== 1
    ) {
      throw new Error("SETTLEMENT_VALIDATION_FAILED");
    }

    const refundRoute = `/parent/orders/${orderTwo.id}/refund`;
    await parent.postAction(refundRoute, "refundAmount", {
      orderId: orderTwo.id,
      reason: "OTHER",
      description: "E2E_REFUND",
      refundAmount: String(orderTwo.totalAmount),
    });
    const refund = await one<RowDataPacket & { id: string; previousOrderStatus: string }>(
      connection,
      "SELECT id, previousOrderStatus FROM `Refund` WHERE orderId = ?",
      [orderTwo.id],
    );
    const refundPage = `/admin/refunds/${refund.id}`;
    await admin.postAction(
      refundPage,
      "adminNote",
      { refundId: refund.id, adminNote: "E2E_REJECTED" },
      { occurrence: 1 },
    );
    const restored = await one<RowDataPacket & { status: string }>(
      connection,
      "SELECT status FROM `Order` WHERE id = ?",
      [orderTwo.id],
    );
    if (restored.status !== refund.previousOrderStatus) {
      throw new Error("REFUND_STATUS_NOT_RESTORED");
    }
    if (
      (await scalar(
        connection,
        "SELECT COUNT(*) AS value FROM `Settlement` WHERE orderId = ?",
        [orderTwo.id],
      )) !== 0
    ) {
      throw new Error("REFUND_ORDER_SETTLED");
    }

    const duplicateDedupeKeys = await scalar(
      connection,
      `SELECT COUNT(*) AS value FROM (
        SELECT dedupeKey FROM \`Notification\`
        WHERE dedupeKey IS NOT NULL
        GROUP BY dedupeKey HAVING COUNT(*) > 1
      ) duplicate_keys`,
    );
    if (duplicateDedupeKeys !== 0) throw new Error("DUPLICATE_NOTIFICATION_KEY");

    const total = await scalar(
      connection,
      `SELECT
        (SELECT COUNT(*) FROM \`User\`) +
        (SELECT COUNT(*) FROM \`ParentProfile\`) +
        (SELECT COUNT(*) FROM \`TutorProfile\`) +
        (SELECT COUNT(*) FROM \`TutorVerificationDocument\`) +
        (SELECT COUNT(*) FROM \`Demand\`) +
        (SELECT COUNT(*) FROM \`Order\`) +
        (SELECT COUNT(*) FROM \`Payment\`) +
        (SELECT COUNT(*) FROM \`Refund\`) +
        (SELECT COUNT(*) FROM \`LessonFeedback\`) +
        (SELECT COUNT(*) FROM \`Review\`) +
        (SELECT COUNT(*) FROM \`Settlement\`) +
        (SELECT COUNT(*) FROM \`Notification\`) AS value`,
    );
    console.log(
      JSON.stringify({
        ok: true,
        registrations: 2,
        logins: 3,
        proofUploadAndApproval: true,
        completeOrder: true,
        refundRejectionRestored: true,
        duplicateBookings: 0,
        duplicateSettlements: 0,
        duplicateNotificationKeys: 0,
        mysqlGeneratedProofConstraint: true,
        temporaryTotalRecords: total,
        addedRecords: total - 154,
      }),
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, category: String((error as Error).message) }));
  process.exitCode = 1;
});
