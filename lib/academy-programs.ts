export type ClientType = "turf" | "yoga" | "chess" | "cricket";
export type MemberStatus = "demo" | "active" | "inactive";
export type AcademyProgramSlug =
  | "yoga_morning"
  | "yoga_women_evening"
  | "chess_evening"
  | "cricket_evening";
export type InvoiceFeeKind = "monthly" | "new_registration" | "other";

export type AcademyProgram = {
  slug: AcademyProgramSlug;
  category: Exclude<ClientType, "turf">;
  name: string;
  shortName: string;
  schedule: string;
  audience: string;
  monthlyFee: number;
  registrationFee: number;
};

export const academyPrograms: AcademyProgram[] = [
  {
    slug: "yoga_morning",
    category: "yoga",
    name: "Yoga Morning Batch",
    shortName: "Morning Yoga",
    schedule: "8:00 AM - 9:15 AM",
    audience: "Open to all",
    monthlyFee: 1200,
    registrationFee: 0,
  },
  {
    slug: "yoga_women_evening",
    category: "yoga",
    name: "Women’s Yoga Evening Batch",
    shortName: "Women’s Yoga",
    schedule: "5:00 PM - 6:00 PM",
    audience: "Women only",
    monthlyFee: 1200,
    registrationFee: 0,
  },
  {
    slug: "chess_evening",
    category: "chess",
    name: "Chess Academy",
    shortName: "Chess Academy",
    schedule: "6:30 PM - 8:00 PM",
    audience: "Academy members",
    monthlyFee: 1500,
    registrationFee: 0,
  },
  {
    slug: "cricket_evening",
    category: "cricket",
    name: "Cricket Academy",
    shortName: "Cricket Academy",
    schedule: "6:30 PM - 8:00 PM",
    audience: "Academy members",
    monthlyFee: 1500,
    registrationFee: 500,
  },
];

export function getAcademyProgram(slug?: string | null) {
  return academyPrograms.find((program) => program.slug === slug);
}

export function programOptionsForClientType(type: ClientType) {
  return academyPrograms.filter((program) => program.category === type);
}

export function invoiceAmountForPlan(
  programSlug: AcademyProgramSlug,
  feeKind: InvoiceFeeKind,
) {
  const program = getAcademyProgram(programSlug);
  if (!program) return 0;
  if (feeKind === "new_registration") {
    return program.monthlyFee + program.registrationFee;
  }
  return program.monthlyFee;
}

export function invoiceDescriptionForPlan(
  programSlug: AcademyProgramSlug,
  feeKind: InvoiceFeeKind,
) {
  const program = getAcademyProgram(programSlug);
  if (!program) return "Academy fee";
  if (feeKind === "new_registration" && program.registrationFee) {
    return `${program.name} - first month fee + registration`;
  }
  return `${program.name} - monthly fee`;
}
