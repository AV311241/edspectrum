/**
 * Canonical vocabulary for the Parent Interaction register.
 *
 * The source is an Excel sheet filled in by field workers, so the raw values are
 * free text with inconsistent casing and spacing ("Phone call", "phone-call",
 * "PHONE CALL"). The service folds them onto these tokens so that filtering and
 * grouping in the GET endpoint are exact-match rather than fuzzy.
 *
 * Stored as `String` columns rather than Prisma enums deliberately: an enum makes
 * the database reject any value not yet listed, which would mean a migration for
 * every new mode a programme introduces. Normalisation here gives the same
 * grouping guarantee while staying forward-compatible.
 */

/** Contact mode of the parent-teacher interaction. */
export const PARENT_INTERACTION_MODES = [
  'PHONE_CALL',
  'IN_PERSON',
  'HOME_VISIT',
  'SCHOOL_MEETING',
  'SMS',
  'WHATSAPP',
  'VIDEO_CALL',
  'OTHER',
] as const;
export type ParentInteractionMode = (typeof PARENT_INTERACTION_MODES)[number];

/** Lifecycle state of a register entry. */
export const PARENT_INTERACTION_STATUSES = [
  'PLANNED',
  'COMPLETED',
  'FOLLOW_UP',
  'CANCELLED',
] as const;
export type ParentInteractionStatus = (typeof PARENT_INTERACTION_STATUSES)[number];

/** Default applied when the sheet leaves `status` blank. */
export const DEFAULT_PARENT_INTERACTION_STATUS: ParentInteractionStatus = 'PLANNED';

/** How the contacted adult relates to the student. */
export const PARENT_RELATIONS = [
  'FATHER',
  'MOTHER',
  'GRANDFATHER',
  'GRANDMOTHER',
  'UNCLE',
  'AUNT',
  'SIBLING',
  'LEGAL_GUARDIAN',
  'OTHER',
] as const;
export type ParentRelation = (typeof PARENT_RELATIONS)[number];

/**
 * Spreadsheet shorthands -> canonical token.
 *
 * These are the spellings that actually appear in the register sheets. Anything
 * unrecognised falls through to `OTHER` for the closed vocabularies rather than
 * being rejected, so an unusual entry is still recorded.
 */
const MODE_ALIASES: Record<string, ParentInteractionMode> = {
  PHONE: 'PHONE_CALL',
  CALL: 'PHONE_CALL',
  PHONECALL: 'PHONE_CALL',
  TELEPHONE: 'PHONE_CALL',
  'PHONE-CALL': 'PHONE_CALL',
  INPERSON: 'IN_PERSON',
  'IN-PERSON': 'IN_PERSON',
  FACE_TO_FACE: 'IN_PERSON',
  MEETING: 'SCHOOL_MEETING',
  VISIT: 'HOME_VISIT',
  'HOME-VISIT': 'HOME_VISIT',
  HOMEVISIT: 'HOME_VISIT',
  TEXT: 'SMS',
  MESSAGE: 'SMS',
  VIDEO: 'VIDEO_CALL',
  'VIDEO-CALL': 'VIDEO_CALL',
  VIDEOCALL: 'VIDEO_CALL',
};

const STATUS_ALIASES: Record<string, ParentInteractionStatus> = {
  DONE: 'COMPLETED',
  COMPLETE: 'COMPLETED',
  FINISHED: 'COMPLETED',
  PENDING: 'FOLLOW_UP',
  FOLLOWUP: 'FOLLOW_UP',
  'FOLLOW-UP': 'FOLLOW_UP',
  UPCOMING: 'PLANNED',
  SCHEDULED: 'PLANNED',
  CANCELED: 'CANCELLED',
  NOT_DONE: 'CANCELLED',
};

const RELATION_ALIASES: Record<string, ParentRelation> = {
  DAD: 'FATHER',
  PAPA: 'FATHER',
  MOM: 'MOTHER',
  MUM: 'MOTHER',
  MAMA: 'MOTHER',
  GRANDPA: 'GRANDFATHER',
  GRANDMA: 'GRANDMOTHER',
  NANA: 'GRANDMOTHER',
  NANI: 'GRANDMOTHER',
  AUNTY: 'AUNT',
  AUNTIE: 'AUNT',
  UNCLE: 'UNCLE',
  BROTHER: 'SIBLING',
  SISTER: 'SIBLING',
  GUARDIAN: 'LEGAL_GUARDIAN',
  CAREGIVER: 'LEGAL_GUARDIAN',
};

/**
 * Fold free text onto the canonical token set.
 *
 * `key` lookup is performed on the *normalised* key (upper-cased, with spaces,
 * hyphens and underscores removed) as well as the raw value, so a single alias
 * table covers "Phone Call", "phone-call" and "PHONE_CALL" alike.
 */
function normaliseToToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]+/g, '');
}

/** Returns the canonical mode, or `OTHER` for a blank/unrecognised value. */
export function normaliseInteractionMode(raw: string | null | undefined): ParentInteractionMode | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const flat = normaliseToToken(trimmed);
  if (MODE_ALIASES[flat]) return MODE_ALIASES[flat];

  const canonical = (PARENT_INTERACTION_MODES as readonly string[]).find((m) => normaliseToToken(m) === flat);
  if (canonical) return canonical as ParentInteractionMode;

  return 'OTHER';
}

/** Returns the canonical status, or the supplied fallback for a blank value. */
export function normaliseInteractionStatus(
  raw: string | null | undefined,
  fallback: ParentInteractionStatus = DEFAULT_PARENT_INTERACTION_STATUS
): ParentInteractionStatus {
  if (raw === null || raw === undefined) return fallback;
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;

  const flat = normaliseToToken(trimmed);
  if (STATUS_ALIASES[flat]) return STATUS_ALIASES[flat];

  const canonical = (PARENT_INTERACTION_STATUSES as readonly string[]).find((s) => normaliseToToken(s) === flat);
  if (canonical) return canonical as ParentInteractionStatus;

  return 'COMPLETED';
}

/** Returns the canonical relation, or `OTHER` for a blank/unrecognised value. */
export function normaliseParentRelation(raw: string | null | undefined): ParentRelation | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const flat = normaliseToToken(trimmed);
  if (RELATION_ALIASES[flat]) return RELATION_ALIASES[flat];

  const canonical = (PARENT_RELATIONS as readonly string[]).find((r) => normaliseToToken(r) === flat);
  if (canonical) return canonical as ParentRelation;

  return 'OTHER';
}