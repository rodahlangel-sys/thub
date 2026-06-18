/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getCertificationStatusLabel,
  getDashboardPath,
  getTeachModeLabel,
} from "@/lib/roles";
import {
  formatTutorDocumentSize,
  isSchoolProofDocument,
  tutorDocumentStatusLabels,
  tutorDocumentTypeLabels,
} from "@/lib/tutor-documents";
import {
  approveTutorCertificationAction,
  rejectTutorCertificationAction,
} from "./actions";

type AdminTutorDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

const statusTone = {
  PENDING: "yellow",
  APPROVED: "green",
  REJECTED: "red",
} as const;

const documentStatusTone = {
  DRAFT: "gray",
  SUBMITTED: "yellow",
  APPROVED: "green",
  REJECTED: "red",
} as const;

const rejectionQuickReasons = [
  "在校证明不清晰",
  "无法确认学校信息",
  "证明内容不完整",
  "资料与证明不一致",
  "证明材料无效",
  "能力证明无法识别",
  "其他",
];

function DocumentPreview({
  document,
}: {
  document: {
    id: string;
    type: keyof typeof tutorDocumentTypeLabels;
    originalName: string;
    sizeBytes: number;
    status: keyof typeof tutorDocumentStatusLabels;
    rejectionReason: string | null;
    createdAt: Date;
  };
}) {
  return (
    <div className="rounded-2xl border border-[#dbe7e4] bg-white p-4">
      <a
        className="block overflow-hidden rounded-xl border border-[#e1ebe8] bg-[#f8fbfa]"
        href={`/api/tutor-documents/${document.id}`}
        rel="noreferrer"
        target="_blank"
      >
        <img
          alt={`${tutorDocumentTypeLabels[document.type]}预览`}
          className="h-52 w-full object-contain"
          src={`/api/tutor-documents/${document.id}`}
        />
      </a>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#182f38]">
            {tutorDocumentTypeLabels[document.type]}
          </p>
          <p className="mt-1 text-xs text-[#60716c]">
            {document.originalName} · {formatTutorDocumentSize(document.sizeBytes)}
          </p>
          <p className="mt-1 text-xs text-[#8a9894]">
            上传于 {document.createdAt.toLocaleString("zh-CN")}
          </p>
        </div>
        <Badge tone={documentStatusTone[document.status]}>
          {tutorDocumentStatusLabels[document.status]}
        </Badge>
      </div>
      {document.rejectionReason ? (
        <p className="mt-3 rounded-xl border border-[#e6b6b6] bg-[#fff1f1] px-3 py-2 text-xs leading-5 text-[#a33b3b]">
          驳回原因：{document.rejectionReason}
        </p>
      ) : null}
    </div>
  );
}

export default async function AdminTutorDetailPage({
  params,
  searchParams,
}: AdminTutorDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const [{ id }, query, tutor] = await Promise.all([
    params,
    searchParams,
    params.then(({ id: tutorId }) =>
      prisma.tutorProfile.findUnique({
        where: { id: tutorId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
          verificationDocuments: {
            orderBy: [{ type: "asc" }, { createdAt: "desc" }],
          },
        },
      }),
    ),
  ]);

  if (!tutor) {
    notFound();
  }

  const userDetails = [
    ["姓名", tutor.user.name],
    ["邮箱", tutor.user.email],
    ["手机号", tutor.user.phone],
    ["注册时间", tutor.user.createdAt.toLocaleString("zh-CN")],
  ];

  const profileDetails = [
    ["学校", tutor.school],
    ["专业", tutor.major],
    ["年级", tutor.grade],
    ["性别", tutor.gender],
    ["可辅导科目", tutor.subjects],
    ["可辅导学段", tutor.teachLevels],
    ["服务区域", tutor.areas],
    ["上课方式", getTeachModeLabel(tutor.teachMode)],
    ["可上课时间", tutor.availableTimes],
    ["价格区间", `${tutor.priceMin}-${tutor.priceMax} 元/小时`],
    ["评分", tutor.rating.toFixed(1)],
    ["接单次数", `${tutor.orderCount}`],
  ];

  const schoolProofDocuments = tutor.verificationDocuments.filter((document) =>
    isSchoolProofDocument(document),
  );
  const optionalDocuments = tutor.verificationDocuments.filter(
    (document) => !isSchoolProofDocument(document),
  );

  return (
    <main className="flex-1 bg-[#f4f7f8] py-8">
      <Container>
        <PageHeader
          actions={<ButtonLink href="/admin/tutors">返回家教审核列表</ButtonLink>}
          description="查看文字资料和证明材料，处理大学生家教认证。"
          eyebrow="认证审核"
          title={tutor.user.name}
        />

        {query?.success ? (
          <div className="mt-6 rounded-md border border-[#b9d8c5] bg-[#f0f8f3] px-4 py-3 text-sm text-[#27734d]">
            {query.success}
          </div>
        ) : null}
        {query?.error ? (
          <div className="mt-6 rounded-md border border-[#e6b6b6] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
            {query.error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="grid gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-[#182f38]">用户基础信息</h2>
                <Badge tone={statusTone[tutor.certificationStatus]}>
                  {getCertificationStatusLabel(tutor.certificationStatus)}
                </Badge>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {userDetails.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-[#708188]">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-[#182f38]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">家教资料</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {profileDetails.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-[#708188]">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-[#182f38]">
                      {value || "待完善"}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">个人简介</h2>
              <p className="mt-3 text-sm leading-7 text-[#60727a]">
                {tutor.introduction || "待完善"}
              </p>
              <h2 className="mt-6 font-semibold text-[#182f38]">过往经验</h2>
              <p className="mt-3 text-sm leading-7 text-[#60727a]">
                {tutor.experience || "待完善"}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#182f38]">证明材料</h2>
                  <p className="mt-2 text-sm leading-6 text-[#60727a]">
                    点击缩略图可打开原图。材料仅供管理员审核，不向家长公开。
                  </p>
                </div>
                <Badge tone={schoolProofDocuments.length > 0 ? "green" : "red"}>
                  {schoolProofDocuments.length > 0 ? "已提交在校证明" : "缺少在校证明"}
                </Badge>
              </div>

              <section className="mt-5">
                <h3 className="text-sm font-semibold text-[#2d4650]">
                  学生证、校园卡或在读证明
                </h3>
                {schoolProofDocuments.length > 0 ? (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {schoolProofDocuments.map((document) => (
                      <DocumentPreview document={document} key={document.id} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-[#cbd8dc] bg-[#fbfdfb] px-4 py-6 text-sm text-[#60716c]">
                    暂未提交在校证明，不能通过认证。
                  </div>
                )}
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-semibold text-[#2d4650]">
                  其他能力证明
                </h3>
                {optionalDocuments.length > 0 ? (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {optionalDocuments.map((document) => (
                      <DocumentPreview document={document} key={document.id} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-[#cbd8dc] bg-[#fbfdfb] px-4 py-6 text-sm text-[#60716c]">
                    暂无其他能力证明。
                  </div>
                )}
              </section>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="font-semibold text-[#182f38]">审核操作</h2>
            <p className="mt-2 text-sm leading-6 text-[#60727a]">
              通过前请确认在校证明清晰有效。驳回时请写清楚原因，学生会在资料页看到说明。
            </p>

            <form action={approveTutorCertificationAction} className="mt-5">
              <input name="tutorProfileId" type="hidden" value={id} />
              <Button className="w-full" type="submit">
                通过认证
              </Button>
            </form>

            <form action={rejectTutorCertificationAction} className="mt-6">
              <input name="tutorProfileId" type="hidden" value={id} />
              <label className="block">
                <span className="text-sm font-medium text-[#2d4650]">
                  驳回原因
                </span>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-md border border-[#cbd8dc] bg-white px-3 py-2 text-sm text-[#182f38] outline-none transition focus:border-[#176b87] focus:ring-2 focus:ring-[#d8edf2]"
                  name="reason"
                  placeholder="请说明资料或证明材料需要修改的地方"
                  required
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {rejectionQuickReasons.map((reason) => (
                  <span
                    className="rounded-full border border-[#d9e3e6] bg-[#f8fbfc] px-3 py-1 text-xs text-[#60727a]"
                    key={reason}
                  >
                    {reason}
                  </span>
                ))}
              </div>
              <Button className="mt-3 w-full" type="submit" variant="danger">
                驳回认证
              </Button>
            </form>

            {tutor.certificationNote ? (
              <div className="mt-6 rounded-md border border-[#d9e3e6] bg-[#f8fbfc] p-4 text-sm leading-6 text-[#60727a]">
                当前备注：{tutor.certificationNote}
              </div>
            ) : null}
          </Card>
        </div>
      </Container>
    </main>
  );
}
