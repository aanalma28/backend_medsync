/**
 * Generate Medical Record Number (MRN) / Patient Code.
 * Format: PTN-[5 uppercase alphanumeric characters]
 * Example: PTN-8K9A2
 */
export function generateMedicalRecordNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PTN-${randomStr}`;
}

/**
 * Generate Employee Staff Code.
 * Format: [DEPT_CODE]-[5 uppercase alphanumeric characters]
 * Example: ADM-SA001, POL-UMU-X89A2
 */
export function generateStaffCode(
  deptCode: string,
  customSuffix?: string,
): string {
  const cleanDeptCode = deptCode ? deptCode.toUpperCase() : 'EMP';
  if (customSuffix && customSuffix.length === 5) {
    return `${cleanDeptCode}-${customSuffix.toUpperCase()}`;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${cleanDeptCode}-${randomStr}`;
}
