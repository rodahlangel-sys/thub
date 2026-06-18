import {
  CertificationStatus,
  PrismaClient,
  TutorDocumentStatus,
  TutorDocumentType,
} from "@prisma/client";
import { privateFileStorage } from "../src/lib/storage";

const prisma = new PrismaClient();

const schoolProofTypes = new Set<TutorDocumentType>([
  TutorDocumentType.STUDENT_CARD,
  TutorDocumentType.ENROLLMENT_PROOF,
]);

const repairReason =
  "请补充有效的学生证、校园卡或在读证明后重新提交审核。";

function isApplyRun() {
  return process.argv.includes("--apply");
}

function isSchoolProof(type: TutorDocumentType) {
  return schoolProofTypes.has(type);
}

async function main() {
  const apply = isApplyRun();
  const profiles = await prisma.tutorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      verificationDocuments: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const documents = await prisma.tutorVerificationDocument.findMany({
    select: {
      id: true,
      tutorProfileId: true,
      type: true,
      status: true,
      storageKey: true,
    },
  });

  const profileIds = new Set(profiles.map((profile) => profile.id));
  const orphanDocuments = documents.filter(
    (document) => !profileIds.has(document.tutorProfileId),
  );
  const missingFiles = [];
  const multipleCurrentSchoolProofs = [];
  const statusMismatches = [];
  const profilesToReject = [];

  for (const document of documents) {
    if (!(await privateFileStorage.exists(document.storageKey))) {
      missingFiles.push(document);
    }
  }

  for (const profile of profiles) {
    const currentSchoolProofs = profile.verificationDocuments.filter(
      (document) =>
        isSchoolProof(document.type) &&
        document.status !== TutorDocumentStatus.REJECTED,
    );

    if (currentSchoolProofs.length > 1) {
      multipleCurrentSchoolProofs.push({
        tutorProfileId: profile.id,
        userId: profile.userId,
        count: currentSchoolProofs.length,
      });
    }

    const requiredStatus =
      profile.certificationStatus === CertificationStatus.APPROVED
        ? TutorDocumentStatus.APPROVED
        : profile.certificationStatus === CertificationStatus.PENDING
          ? TutorDocumentStatus.SUBMITTED
          : null;

    if (!requiredStatus) {
      continue;
    }

    const requiredProofs = profile.verificationDocuments.filter(
      (document) =>
        isSchoolProof(document.type) && document.status === requiredStatus,
    );
    const readableProofs = [];

    for (const proof of requiredProofs) {
      if (await privateFileStorage.exists(proof.storageKey)) {
        readableProofs.push(proof);
      }
    }

    if (readableProofs.length === 0) {
      const issue = {
        tutorProfileId: profile.id,
        userId: profile.userId,
        email: profile.user.email,
        name: profile.user.name,
        certificationStatus: profile.certificationStatus,
        missingRequiredStatus: requiredStatus,
      };

      statusMismatches.push(issue);
      profilesToReject.push(profile.id);
    }
  }

  console.log(`Apply mode: ${apply ? "yes" : "no (dry-run)"}`);
  console.log(`Approved/pending profiles missing required proof: ${statusMismatches.length}`);
  console.log(`Documents with missing files: ${missingFiles.length}`);
  console.log(`Orphan document records: ${orphanDocuments.length}`);
  console.log(`Profiles with multiple current school proofs: ${multipleCurrentSchoolProofs.length}`);

  for (const issue of statusMismatches) {
    console.log(JSON.stringify(issue));
  }

  if (apply && profilesToReject.length > 0) {
    const result = await prisma.tutorProfile.updateMany({
      where: {
        id: { in: profilesToReject },
        certificationStatus: {
          in: [CertificationStatus.APPROVED, CertificationStatus.PENDING],
        },
      },
      data: {
        certificationStatus: CertificationStatus.REJECTED,
        certificationNote: repairReason,
      },
    });

    console.log(`Repaired tutor profiles: ${result.count}`);
  }

  if (!apply && statusMismatches.length > 0) {
    console.log(
      "Dry-run found profiles that should be moved to REJECTED before relying on document-based certification.",
    );
  }
}

main()
  .catch((error) => {
    console.error("Failed to check tutor verification consistency", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
