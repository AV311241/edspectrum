export enum BaselineDomain {
  VOCABULARY = 'Vocabulary',
  GRAMMAR = 'Grammar',
  PHRASE_SENTENCE = 'Phrase_Sentence',
  LISTENING = 'Listening',
  SPEAKING = 'Speaking',
  READING = 'Reading',
  WRITING = 'Writing',
}

export enum AssessmentStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  PARTIAL = 'Partial',
}

export enum OralFlag {
  C0 = 'C0',
  C1 = 'C1',
  C2 = 'C2',
  C3 = 'C3',
}

export enum SuggestedStage {
  S1 = 'S1',
  S2 = 'S2',
  S3 = 'S3',
  S4 = 'S4',
  S5 = 'S5',
  REVIEW = 'Review',
  AB = 'AB',
}

export const ALL_BASELINE_DOMAINS: BaselineDomain[] = [
  BaselineDomain.VOCABULARY,
  BaselineDomain.GRAMMAR,
  BaselineDomain.PHRASE_SENTENCE,
  BaselineDomain.LISTENING,
  BaselineDomain.SPEAKING,
  BaselineDomain.READING,
  BaselineDomain.WRITING,
];
