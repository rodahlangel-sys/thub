export type DataConsistencyReport = {
  duplicateBookings: number;
  pendingRefundsMissingPreviousStatus: number;
  paymentAmountMismatches: number;
  profilesWithMultipleActiveSchoolProofs: number;
  profilesOverOptionalDocumentLimit: number;
  duplicateNotificationDedupeKeys: number;
  duplicateLegacyNotificationPayloads: number;
};

const blockingFields: Array<keyof DataConsistencyReport> = [
  "duplicateBookings",
  "pendingRefundsMissingPreviousStatus",
  "paymentAmountMismatches",
  "profilesWithMultipleActiveSchoolProofs",
  "profilesOverOptionalDocumentLimit",
  "duplicateNotificationDedupeKeys",
];

export function hasBlockingConsistencyIssues(report: DataConsistencyReport) {
  return blockingFields.some((field) => report[field] > 0);
}
