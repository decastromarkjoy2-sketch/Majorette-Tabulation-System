export const SCHOOLS = [
  { schoolCode: "01", schoolName: "GNHS" },
  { schoolCode: "02", schoolName: "PDSI" },
  { schoolCode: "03", schoolName: "CTPNHS" },
  { schoolCode: "04", schoolName: "PNHS" },
  { schoolCode: "05", schoolName: "BNHS" },
] as const;

export type SchoolCode = (typeof SCHOOLS)[number]["schoolCode"];
export type CompetitionCategory = "group" | "solo";

export function isCompetitionCategory(value: string): value is CompetitionCategory {
  return value === "group" || value === "solo";
}

export function getSchool(schoolCode: string) {
  return SCHOOLS.find((school) => school.schoolCode === schoolCode);
}

export function formatEntryNo(entryNo: number): string {
  return String(entryNo).padStart(2, "0");
}