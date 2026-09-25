import { provide } from 'inversify-binding-decorators';
import { Prisma, AssessmentStatus as PrismaAssessmentStatus } from '@prisma/client';
import { prisma } from '../config/db.config';
import { BaselineDomain, AssessmentStatus, OralFlag, SuggestedStage } from '../constants/baseline.constants';
import { AppError } from '../utils/appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';

export interface DomainScoreRecord {
  id: number;
  assessmentId: number;
  domain: BaselineDomain;
  item1: number | null;
  item2: number | null;
  item3: number | null;
  item4: number | null;
  item5: number | null;
  domainScore: number;
  suggestedStage: SuggestedStage;
  finalStage: SuggestedStage | null;
  reviewNeeded: boolean;
  createdAt: Date;
}

export interface BaselineAssessmentRecord {
  id: number;
  studentId: string;
  assessmentDate: string;
  assessorName: string;
  status: AssessmentStatus;
  keySupportFlag: string | null;
  oralFlag: OralFlag | null;
  qcNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  domainScores?: DomainScoreRecord[];
}

export interface IBaselineAssessmentRepository {
  create(assessment: Omit<BaselineAssessmentRecord, 'id' | 'createdAt' | 'updatedAt'>, scores: Omit<DomainScoreRecord, 'id' | 'assessmentId' | 'createdAt'>[]): Promise<BaselineAssessmentRecord>;
  findById(id: number): Promise<BaselineAssessmentRecord | null>;
  findByStudentId(studentId: string): Promise<BaselineAssessmentRecord[]>;
  findAll(limit: number, offset: number): Promise<{ records: BaselineAssessmentRecord[]; total: number }>;
  exportFlat(): Promise<Record<string, unknown>[]>;
  update(id: number, assessment: Partial<BaselineAssessmentRecord>): Promise<BaselineAssessmentRecord | null>;
  delete(id: number): Promise<boolean>;
}

const assessmentInclude = {
  domainResults: { include: { domain: true } },
  student: true,
  assessor: true,
} satisfies Prisma.BaselineAssessmentInclude;

type AssessmentWithRelations = Prisma.BaselineAssessmentGetPayload<{ include: typeof assessmentInclude }>;

const API_TO_PRISMA_STATUS: Record<AssessmentStatus, PrismaAssessmentStatus> = {
  [AssessmentStatus.PRESENT]: PrismaAssessmentStatus.PRESENT,
  [AssessmentStatus.ABSENT]: PrismaAssessmentStatus.ABSENT,
  [AssessmentStatus.PARTIAL]: PrismaAssessmentStatus.PARTIAL,
};

function fromPrismaStatus(status: PrismaAssessmentStatus): AssessmentStatus {
  switch (status) {
    case PrismaAssessmentStatus.ABSENT:
      return AssessmentStatus.ABSENT;
    case PrismaAssessmentStatus.PARTIAL:
      return AssessmentStatus.PARTIAL;
    default:
      return AssessmentStatus.PRESENT;
  }
}

function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function mapDomain(name: string): BaselineDomain {
  const match = Object.values(BaselineDomain).find((domain) => domain === name);
  if (!match) {
    throw new AppError(`Unknown assessment domain '${name}'`, HttpStatusCode.BAD_REQUEST);
  }
  return match;
}

function mapRecord(record: AssessmentWithRelations): BaselineAssessmentRecord {
  return {
    id: record.id,
    studentId: record.student.studentIdCode,
    assessmentDate: toDateOnlyString(record.assessmentDate),
    assessorName: `${record.assessor.firstName} ${record.assessor.lastName}`.trim(),
    status: fromPrismaStatus(record.status),
    keySupportFlag: record.keySupportFlag,
    oralFlag: (record.oralFlag as OralFlag | null) ?? null,
    qcNotes: record.qcNotes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    domainScores: record.domainResults.map((result) => ({
      id: result.id,
      assessmentId: result.assessmentId,
      domain: mapDomain(result.domain.name),
      item1: result.item1,
      item2: result.item2,
      item3: result.item3,
      item4: result.item4,
      item5: result.item5,
      domainScore: result.totalScore ?? 0,
      suggestedStage: (result.suggestedStage as SuggestedStage) ?? SuggestedStage.REVIEW,
      finalStage: (result.finalStage as SuggestedStage | null) ?? null,
      reviewNeeded: result.reviewNeeded,
      createdAt: result.createdAt,
    })),
  };
}

function toFlatRow(record: AssessmentWithRelations): Record<string, unknown> {
  const scoreMap = new Map(record.domainResults.map((result) => [result.domain.name, result]));
  const row: Record<string, unknown> = {
    Student_ID: record.student.studentIdCode,
    Assessment_Date: toDateOnlyString(record.assessmentDate),
    Assessor: `${record.assessor.firstName} ${record.assessor.lastName}`.trim(),
    Status: fromPrismaStatus(record.status),
    Key_Support_Flag: record.keySupportFlag,
    Oral_Flag: record.oralFlag,
    QC_Notes: record.qcNotes,
  };

  const domains = ['Vocabulary', 'Grammar', 'Phrase_Sentence', 'Listening', 'Speaking', 'Reading', 'Writing'];
  const domainPrefixes: Record<string, string> = {
    Vocabulary: 'V',
    Grammar: 'G',
    Phrase_Sentence: 'P',
    Listening: 'L',
    Speaking: 'S',
    Reading: 'R',
    Writing: 'W',
  };

  domains.forEach((dom) => {
    const prefix = domainPrefixes[dom] || dom.substring(0, 1);
    const ds = scoreMap.get(dom);
    row[`${prefix}1`] = ds?.item1 ?? null;
    row[`${prefix}2`] = ds?.item2 ?? null;
    row[`${prefix}3`] = ds?.item3 ?? null;
    row[`${prefix}4`] = ds?.item4 ?? null;
    row[`${prefix}5`] = ds?.item5 ?? null;
    row[`${prefix}_Score`] = ds?.totalScore ?? 0;
    row[`${prefix}_Suggested_Stage`] = ds?.suggestedStage ?? null;
    row[`${prefix}_Final_Stage`] = ds?.finalStage ?? null;
    row[`${prefix}_Review_Flag`] = ds?.reviewNeeded ? 'Review Needed' : '';
  });

  return row;
}

@provide(BaselineAssessmentRepository)
export class BaselineAssessmentRepository implements IBaselineAssessmentRepository {
  public async create(
    assessmentData: Omit<BaselineAssessmentRecord, 'id' | 'createdAt' | 'updatedAt'>,
    scoresData: Omit<DomainScoreRecord, 'id' | 'assessmentId' | 'createdAt'>[]
  ): Promise<BaselineAssessmentRecord> {
    const created = await prisma.$transaction(async (tx) => {
      const { student, assessor, version, domainByName } = await this.resolveCreateContext(tx, assessmentData, scoresData);

      if (!student.classId) {
        throw new AppError(
          `Student '${assessmentData.studentId}' is not assigned to a class section`,
          HttpStatusCode.BAD_REQUEST
        );
      }

      return tx.baselineAssessment.create({
        data: {
          studentId: student.id,
          schoolId: student.schoolId,
          classSectionId: student.classId,
          studentClassEnrollmentId: null,
          assessmentVersionId: version.id,
          assessmentDate: parseDateOnly(assessmentData.assessmentDate),
          assessorId: assessor.id,
          createdById: assessor.id,
          status: API_TO_PRISMA_STATUS[assessmentData.status],
          keySupportFlag: assessmentData.keySupportFlag,
          oralFlag: assessmentData.oralFlag,
          qcNotes: assessmentData.qcNotes,
          domainResults: {
            create: scoresData.map((score) => {
              const domain = domainByName.get(score.domain);
              if (!domain) {
                throw new AppError(
                  `Assessment domain '${score.domain}' is not seeded in the database`,
                  HttpStatusCode.BAD_REQUEST
                );
              }
              return {
                domainId: domain.id,
                item1: score.item1,
                item2: score.item2,
                item3: score.item3,
                item4: score.item4,
                item5: score.item5,
                totalScore: score.domainScore,
                suggestedStage: score.suggestedStage,
                finalStage: score.finalStage,
                reviewNeeded: score.reviewNeeded,
              };
            }),
          },
        },
        include: assessmentInclude,
      });
    });

    return mapRecord(created);
  }

  public async findById(id: number): Promise<BaselineAssessmentRecord | null> {
    const record = await prisma.baselineAssessment.findUnique({
      where: { id },
      include: assessmentInclude,
    });
    return record ? mapRecord(record) : null;
  }

  public async findByStudentId(studentId: string): Promise<BaselineAssessmentRecord[]> {
    const records = await prisma.baselineAssessment.findMany({
      where: { student: { studentIdCode: studentId } },
      include: assessmentInclude,
      orderBy: { id: 'asc' },
    });
    return records.map(mapRecord);
  }

  public async findAll(limit: number, offset: number): Promise<{ records: BaselineAssessmentRecord[]; total: number }> {
    const [records, total] = await prisma.$transaction([
      prisma.baselineAssessment.findMany({
        skip: offset,
        take: limit,
        include: assessmentInclude,
        orderBy: { id: 'asc' },
      }),
      prisma.baselineAssessment.count(),
    ]);

    return {
      records: records.map(mapRecord),
      total,
    };
  }

  public async exportFlat(): Promise<Record<string, unknown>[]> {
    const records = await prisma.baselineAssessment.findMany({
      include: assessmentInclude,
      orderBy: { id: 'asc' },
    });
    return records.map(toFlatRow);
  }

  public async update(id: number, assessmentData: Partial<BaselineAssessmentRecord>): Promise<BaselineAssessmentRecord | null> {
    const existing = await prisma.baselineAssessment.findUnique({
      where: { id },
      include: { student: true, assessor: true },
    });
    if (!existing) return null;

    const updated = await prisma.$transaction(async (tx) => {
      let studentId = existing.studentId;
      let schoolId = existing.schoolId;
      let classSectionId = existing.classSectionId;
      let assessorId = existing.assessorId;

      if (assessmentData.studentId) {
        const student = await this.findStudent(tx, assessmentData.studentId);
        if (!student.classId) {
          throw new AppError(
            `Student '${assessmentData.studentId}' is not assigned to a class section`,
            HttpStatusCode.BAD_REQUEST
          );
        }
        studentId = student.id;
        schoolId = student.schoolId;
        classSectionId = student.classId;
      }

      if (assessmentData.assessorName) {
        const assessor = await this.findAssessor(tx, assessmentData.assessorName);
        assessorId = assessor.id;
      }

      const header = await tx.baselineAssessment.update({
        where: { id },
        data: {
          studentId,
          schoolId,
          classSectionId,
          assessorId,
          assessmentDate: assessmentData.assessmentDate
            ? parseDateOnly(assessmentData.assessmentDate)
            : undefined,
          status: assessmentData.status ? API_TO_PRISMA_STATUS[assessmentData.status] : undefined,
          keySupportFlag: assessmentData.keySupportFlag,
          oralFlag: assessmentData.oralFlag,
          qcNotes: assessmentData.qcNotes,
        },
        include: assessmentInclude,
      });

      if (assessmentData.domainScores?.length) {
        const domains = await tx.assessmentDomain.findMany();
        const domainByName = new Map(domains.map((domain) => [domain.name, domain]));

        for (const score of assessmentData.domainScores) {
          const domain = domainByName.get(score.domain);
          if (!domain) {
            throw new AppError(
              `Assessment domain '${score.domain}' is not seeded in the database`,
              HttpStatusCode.BAD_REQUEST
            );
          }

          await tx.domainResult.upsert({
            where: {
              assessmentId_domainId: {
                assessmentId: id,
                domainId: domain.id,
              },
            },
            create: {
              assessmentId: id,
              domainId: domain.id,
              item1: score.item1,
              item2: score.item2,
              item3: score.item3,
              item4: score.item4,
              item5: score.item5,
              totalScore: score.domainScore,
              suggestedStage: score.suggestedStage,
              finalStage: score.finalStage,
              reviewNeeded: score.reviewNeeded,
            },
            update: {
              item1: score.item1,
              item2: score.item2,
              item3: score.item3,
              item4: score.item4,
              item5: score.item5,
              totalScore: score.domainScore,
              suggestedStage: score.suggestedStage,
              finalStage: score.finalStage,
              reviewNeeded: score.reviewNeeded,
            },
          });
        }

        return tx.baselineAssessment.findUniqueOrThrow({
          where: { id },
          include: assessmentInclude,
        });
      }

      return header;
    });

    return mapRecord(updated);
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await prisma.baselineAssessment.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  private async resolveCreateContext(
    tx: Prisma.TransactionClient,
    assessmentData: Omit<BaselineAssessmentRecord, 'id' | 'createdAt' | 'updatedAt'>,
    scoresData: Omit<DomainScoreRecord, 'id' | 'assessmentId' | 'createdAt'>[]
  ) {
    const [student, assessor, version, domains] = await Promise.all([
      this.findStudent(tx, assessmentData.studentId),
      this.findAssessor(tx, assessmentData.assessorName),
      this.findCurrentVersion(tx),
      tx.assessmentDomain.findMany(),
    ]);

    const domainByName = new Map(domains.map((domain) => [domain.name, domain]));
    for (const score of scoresData) {
      if (!domainByName.has(score.domain)) {
        throw new AppError(
          `Assessment domain '${score.domain}' is not seeded in the database`,
          HttpStatusCode.BAD_REQUEST
        );
      }
    }

    return { student, assessor, version, domainByName };
  }

  private async findStudent(tx: Prisma.TransactionClient, studentIdCode: string) {
    const matches = await tx.student.findMany({
      where: { studentIdCode },
    });
    if (matches.length === 0) {
      throw new AppError(`Student '${studentIdCode}' was not found`, HttpStatusCode.BAD_REQUEST);
    }
    if (matches.length > 1) {
      throw new AppError(
        `Student ID '${studentIdCode}' is not unique across schools; seed or qualify the student first`,
        HttpStatusCode.CONFLICT
      );
    }
    return matches[0];
  }

  private async findAssessor(tx: Prisma.TransactionClient, assessorName: string) {
    const parts = assessorName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    const assessor = lastName
      ? await tx.user.findFirst({ where: { firstName, lastName } })
      : await tx.user.findFirst({
          where: {
            OR: [{ firstName }, { email: assessorName }],
          },
        });

    if (!assessor) {
      throw new AppError(
        `Assessor '${assessorName}' was not found as an existing user`,
        HttpStatusCode.BAD_REQUEST
      );
    }
    return assessor;
  }

  private async findCurrentVersion(tx: Prisma.TransactionClient) {
    const version =
      (await tx.assessmentVersion.findFirst({ where: { isCurrent: true } })) ??
      (await tx.assessmentVersion.findFirst({ orderBy: { id: 'asc' } }));

    if (!version) {
      throw new AppError(
        'No assessment version is seeded; create an AssessmentVersion before saving assessments',
        HttpStatusCode.BAD_REQUEST
      );
    }
    return version;
  }
}
