/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { TeachMode, TutorDocumentStatus, TutorDocumentType, UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { TutorDocumentUploadForm } from "@/components/tutor/TutorDocumentUploadForm";
import { PageShell } from "@/components/ui/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";
import { getTutorProfileCompleteness } from "@/lib/tutor-profile";
import { getTutorTeachModeLabel } from "@/lib/tutor-display";
import {
  canEditTutorDocuments,
  formatTutorDocumentSize,
  isSchoolProofDocument,
  MAX_OPTIONAL_TUTOR_DOCUMENTS,
  tutorDocumentStatusLabels,
  tutorDocumentTypeLabels,
} from "@/lib/tutor-documents";
import {
  deleteTutorDocumentAction,
  updateTutorProfileAction,
  uploadTutorDocumentAction,
} from "./actions";

type TutorProfilePageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

const inputClassName =
  "mt-2 h-11 w-full rounded-xl border border-[#cbd8dc] bg-white px-3 text-sm text-[#182f38] outline-none transition focus:border-[#117b7a] focus:ring-2 focus:ring-[#d8edf2] disabled:bg-[#f4f7f5] disabled:text-[#8a9a96]";

const textareaClassName =
  "mt-2 min-h-28 w-full rounded-xl border border-[#cbd8dc] bg-white px-3 py-3 text-sm text-[#182f38] outline-none transition focus:border-[#117b7a] focus:ring-2 focus:ring-[#d8edf2] disabled:bg-[#f4f7f5] disabled:text-[#8a9a96]";

const badgeToneByStatus = {
  PENDING: "yellow",
  APPROVED: "green",
  REJECTED: "red",
} as const;

const statusLabels = {
  PENDING: "审核中",
  APPROVED: "已认证",
  REJECTED: "需修改",
} as const;

const statusMessages = {
  PENDING: "资料提交后，平台会核验你的文字资料和证明材料。",
  APPROVED: "资料已通过平台认证，家长只会看到认证结果，不会看到证明原图。",
  REJECTED: "资料或证明材料需要修改，请根据说明调整后重新提交。",
} as const;

function DocumentCard({
  document,
  canEdit,
}: {
  document: {
    id: string;
    type: TutorDocumentType;
    originalName: string;
    sizeBytes: number;
    status: TutorDocumentStatus;
    rejectionReason: string | null;
    createdAt: Date;
  };
  canEdit: boolean;
}) {
  const isSubmitted = document.status === TutorDocumentStatus.SUBMITTED;
  const canDelete = canEdit && !isSubmitted;

  return (
    <div className="rounded-2xl border border-[#dbe7e4] bg-white p-4 shadow-[0_14px_34px_rgba(31,79,72,0.06)]">
      <a
        className="block overflow-hidden rounded-xl border border-[#e1ebe8] bg-[#f8fbfa]"
        href={`/api/tutor-documents/${document.id}`}
        rel="noreferrer"
        target="_blank"
      >
        <img
          alt={`${tutorDocumentTypeLabels[document.type]}预览`}
          className="h-44 w-full object-contain"
          src={`/api/tutor-documents/${document.id}`}
        />
      </a>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#182f38]">
            {document.originalName}
          </p>
          <p className="mt-1 text-xs text-[#60716c]">
            {tutorDocumentTypeLabels[document.type]} · {formatTutorDocumentSize(document.sizeBytes)} · 上传于{" "}
            {document.createdAt.toLocaleDateString("zh-CN")}
          </p>
        </div>
        <Badge tone={document.status === "REJECTED" ? "red" : document.status === "APPROVED" ? "green" : "yellow"}>
          {tutorDocumentStatusLabels[document.status]}
        </Badge>
      </div>

      {document.rejectionReason ? (
        <div className="mt-3 rounded-xl border border-[#e6b6b6] bg-[#fff1f1] px-3 py-2 text-xs leading-5 text-[#a33b3b]">
          驳回原因：{document.rejectionReason}
        </div>
      ) : null}

      {canEdit ? (
        <div className="mt-4 space-y-3">
          <TutorDocumentUploadForm
            action={uploadTutorDocumentAction}
            documentId={document.id}
            documentType={document.type}
            disabled={!canEdit}
            label="替换图片"
          />
          <form action={deleteTutorDocumentAction}>
            <input name="documentId" type="hidden" value={document.id} />
            <button
              className="text-sm font-semibold text-[#a33b3b] hover:text-[#842a2a] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canDelete}
              type="submit"
            >
              删除材料
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default async function TutorProfilePage({
  searchParams,
}: TutorProfilePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const [params, profile] = await Promise.all([
    searchParams,
    prisma.tutorProfile.findUnique({
      where: { userId: user.id },
      include: {
        verificationDocuments: {
          orderBy: [{ type: "asc" }, { createdAt: "desc" }],
        },
      },
    }),
  ]);

  if (!profile) {
    redirect("/tutor");
  }

  const documents = profile.verificationDocuments;
  const canEditDocuments = canEditTutorDocuments(profile.certificationStatus, documents);
  const completeness = getTutorProfileCompleteness(profile);
  const schoolProof = documents.find((document) => isSchoolProofDocument(document));
  const optionalDocuments = documents.filter((document) => !isSchoolProofDocument(document));
  const remainingOptionalCount = Math.max(
    0,
    MAX_OPTIONAL_TUTOR_DOCUMENTS - optionalDocuments.length,
  );
  const formDisabled = !canEditDocuments;
  const submitLabel = formDisabled
    ? "资料审核中"
    : profile.certificationStatus === "REJECTED"
      ? "修改并重新提交"
      : profile.certificationStatus === "APPROVED"
        ? "保存并提交审核"
        : "保存并提交审核";

  return (
    <PageShell compact>
      <section className="mb-7 rounded-[1.75rem] border border-[#dfe8e4] bg-[#fffdf8] p-6 shadow-[0_18px_55px_rgba(31,79,72,0.07)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#117b7a]">我的资料</p>
            <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">
              家教资料与认证
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#60716c]">
              完善文字资料，并上传学生证、校园卡或在读证明。证明材料只供平台管理员核验，不会向家长展示。
            </p>
          </div>
          <Badge tone={badgeToneByStatus[profile.certificationStatus]}>
            {statusLabels[profile.certificationStatus]}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="grid content-start gap-5">
          <Card className="p-5">
            <p className="text-sm text-[#60727a]">资料完整度</p>
            <p className="mt-3 text-3xl font-bold text-[#0f6f70]">
              {completeness.percentage}%
            </p>
            <div className="mt-4 h-2 rounded-full bg-[#e1e9ec]">
              <div
                className="h-2 rounded-full bg-[#117b7a]"
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[#60727a]">
              已完成 {completeness.completed}/{completeness.total} 项
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-[#182f38]">认证状态</h2>
            <p className="mt-2 text-sm leading-6 text-[#60727a]">
              {formDisabled ? "资料正在审核中，暂时不能修改证明材料。" : statusMessages[profile.certificationStatus]}
            </p>
            {profile.certificationStatus === "REJECTED" &&
            profile.certificationNote ? (
              <div className="mt-4 rounded-xl border border-[#e6b6b6] bg-[#fff1f1] p-3 text-sm leading-6 text-[#a33b3b]">
                审核说明：{profile.certificationNote}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="grid gap-6">
          {params?.success ? (
            <div className="rounded-xl border border-[#b9d8c5] bg-[#f0f8f3] px-4 py-3 text-sm text-[#27734d]">
              {params.success}
            </div>
          ) : null}
          {params?.error ? (
            <div className="rounded-xl border border-[#e6b6b6] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
              {params.error}
            </div>
          ) : null}

          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#172c2c]">认证证明材料</h2>
                <p className="mt-2 text-sm leading-6 text-[#60716c]">
                  请上传清晰图片，不要上传身份证、银行卡或支付凭证。
                </p>
              </div>
              <Badge tone={schoolProof ? "green" : "yellow"}>
                {schoolProof ? "已上传在校证明" : "待上传在校证明"}
              </Badge>
            </div>

            <section className="mt-6">
              <div className="rounded-2xl border border-[#dbe7e4] bg-[#f7fbf8] p-4">
                <h3 className="font-semibold text-[#172c2c]">学生证或校园卡</h3>
                <p className="mt-2 text-sm leading-6 text-[#60716c]">
                  仅用于平台管理员核验大学生身份，不会向家长或其他用户展示。
                </p>
                <div className="mt-4">
                  {schoolProof ? (
                    <DocumentCard document={schoolProof} canEdit={canEditDocuments} />
                  ) : canEditDocuments ? (
                    <TutorDocumentUploadForm
                      action={uploadTutorDocumentAction}
                      documentType={TutorDocumentType.STUDENT_CARD}
                      label="上传在校证明"
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#cbd8dc] bg-white px-4 py-6 text-sm text-[#60716c]">
                      暂未上传在校证明。
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#172c2c]">
                    其他能力证明（选填）
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#60716c]">
                    可以上传英语等级、竞赛证书、荣誉证明或家教经历证明，最多 5 张。
                  </p>
                </div>
                <span className="rounded-full bg-[#edf7f4] px-3 py-1 text-xs font-semibold text-[#0f6f70]">
                  已上传 {optionalDocuments.length}/{MAX_OPTIONAL_TUTOR_DOCUMENTS}
                </span>
              </div>

              {optionalDocuments.length > 0 ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {optionalDocuments.map((document) => (
                    <DocumentCard
                      canEdit={canEditDocuments}
                      document={document}
                      key={document.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#cbd8dc] bg-[#fbfdfb] px-4 py-6 text-sm text-[#60716c]">
                  暂未上传其他能力证明。
                </div>
              )}

              {canEditDocuments && remainingOptionalCount > 0 ? (
                <div className="mt-4 rounded-2xl border border-[#dbe7e4] bg-white p-4">
                  <TutorDocumentUploadForm
                    action={uploadTutorDocumentAction}
                    documentType={TutorDocumentType.CERTIFICATE}
                    label="上传能力证明"
                  />
                  <p className="mt-2 text-xs text-[#60716c]">
                    还可以上传 {remainingOptionalCount} 张。
                  </p>
                </div>
              ) : null}
            </section>
          </Card>

          <Card className="p-6">
            <form action={updateTutorProfileAction} className="space-y-8">
              <section>
                <h2 className="text-lg font-bold text-[#172c2c]">基本信息</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-medium text-[#2d4650]">学校</span>
                    <input className={inputClassName} defaultValue={profile.school} disabled={formDisabled} name="school" required />
                  </label>
                  <label>
                    <span className="text-sm font-medium text-[#2d4650]">专业</span>
                    <input className={inputClassName} defaultValue={profile.major} disabled={formDisabled} name="major" required />
                  </label>
                  <label>
                    <span className="text-sm font-medium text-[#2d4650]">年级</span>
                    <input className={inputClassName} defaultValue={profile.grade} disabled={formDisabled} name="grade" required />
                  </label>
                  <label>
                    <span className="text-sm font-medium text-[#2d4650]">性别</span>
                    <input className={inputClassName} defaultValue={profile.gender} disabled={formDisabled} name="gender" required />
                  </label>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-[#172c2c]">辅导能力</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium text-[#2d4650]">可辅导科目</span>
                    <input className={inputClassName} defaultValue={profile.subjects} disabled={formDisabled} name="subjects" placeholder="数学,英语,物理" required />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium text-[#2d4650]">可辅导学段</span>
                    <input className={inputClassName} defaultValue={profile.teachLevels} disabled={formDisabled} name="teachLevels" placeholder="小学,初中,高中" required />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium text-[#2d4650]">个人介绍</span>
                    <textarea className={textareaClassName} defaultValue={profile.introduction} disabled={formDisabled} maxLength={300} name="introduction" required />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-sm font-medium text-[#2d4650]">家教经验</span>
                    <textarea className={textareaClassName} defaultValue={profile.experience} disabled={formDisabled} maxLength={500} name="experience" required />
                  </label>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-[#172c2c]">服务安排</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-medium text-[#2d4650]">服务区域</span>
                    <input className={inputClassName} defaultValue={profile.areas} disabled={formDisabled} name="areas" placeholder="洪山区,武昌区" required />
                  </label>
                  <label>
                    <span className="text-sm font-medium text-[#2d4650]">上课方式</span>
                    <select className={inputClassName} defaultValue={profile.teachMode} disabled={formDisabled} name="teachMode">
                      {Object.values(TeachMode).map((mode) => (
                        <option key={mode} value={mode}>
                          {getTutorTeachModeLabel(mode)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-medium text-[#2d4650]">可约时间</span>
                    <input className={inputClassName} defaultValue={profile.availableTimes} disabled={formDisabled} name="availableTimes" placeholder="周六下午,周日晚上" required />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label>
                      <span className="text-sm font-medium text-[#2d4650]">最低时薪</span>
                      <input className={inputClassName} defaultValue={profile.priceMin} disabled={formDisabled} min={1} name="priceMin" required type="number" />
                    </label>
                    <label>
                      <span className="text-sm font-medium text-[#2d4650]">最高时薪</span>
                      <input className={inputClassName} defaultValue={profile.priceMax} disabled={formDisabled} min={1} name="priceMax" required type="number" />
                    </label>
                  </div>
                </div>
              </section>

              <Button disabled={formDisabled} type="submit">
                {submitLabel}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
