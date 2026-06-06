import type {
  AcademyProgramSlug,
  MemberStatus,
} from "@/lib/academy-programs";

const metadataPattern =
  /^\[\[iplay-crm:v1;program=([a-z_]*);status=(demo|active|inactive)\]\]\n?/;

export function encodeContactNotes({
  programSlug,
  memberStatus,
  notes,
}: {
  programSlug?: AcademyProgramSlug | "";
  memberStatus: MemberStatus;
  notes: string;
}) {
  return `[[iplay-crm:v1;program=${programSlug ?? ""};status=${memberStatus}]]${notes ? `\n${notes}` : ""}`;
}

export function decodeContactNotes(rawNotes?: string | null) {
  const notes = rawNotes ?? "";
  const match = notes.match(metadataPattern);

  return {
    programSlug: (match?.[1] || "") as AcademyProgramSlug | "",
    memberStatus: (match?.[2] || "active") as MemberStatus,
    notes: notes.replace(metadataPattern, ""),
  };
}
