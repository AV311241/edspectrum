
Document Summary :

This document contains the Lumino1 Assessment Rubric and Coding Reference used to interpret student performance data.

It defines:

The 7 assessment domains: Vocabulary, Grammar/Pattern, Phrase/Sentence, Listening, Speaking, Reading, and Writing.
The 5 achievement stages (Stage 1–5) for each domain, describing the progression from basic recognition to flexible, independent language use.
Support Codes such as R, P, WB, F, O, G, and NR, which identify the type of support a student needed during an assessment task.
Oral Participation Flags C0–C3, which describe the level of oral participation, from no valid attempt to independent and confident speaking.
The result-code structure used to combine domain, stage, support, and oral participation information.
Guidelines for how AI should interpret assessment results without confusing achievement level with the amount of support provided.

This reference should be treated as the master definition of all rubric stages, acronyms, codes, and interpretation rules used in Lumino1 assessment data.





Lumino1 Assessment Rubric — AI Reference Data
1. Purpose

This dataset defines the assessment stages, support codes, oral participation flags, and class-level interpretation rules used in Lumino1.

The AI should use this reference to:

Interpret student assessment results.
Understand what each assessment stage means.
Understand the type of support a student required.

2. Assessment Domains

The assessment has 7 domains:

Vocabulary
Grammar/Pattern
Phrase/Sentence
Listening
Speaking
Reading
Writing

Each domain has 5 achievement stages.

Stage	General Meaning
Stage 1	Emerging/basic recognition
Stage 2	Developing controlled use
Stage 3	Independent short/connected use
Stage 4	Explanation, connection, or inference
Stage 5	Flexible, extended, purposeful use
3. Rubric by Domain and Stage
Vocabulary
Stage	Performance Description
Stage 1	Recognises familiar words/pictures and retrieves some words
Stage 2	Chooses words in meaningful sentence context
Stage 3	Uses familiar theme words in own short sentences
Stage 4	Explains/uses one word to show meaning
Stage 5	Uses multiple words in connected response
Grammar/Pattern
Stage	Performance Description
Stage 1	Understands simple position/instruction patterns
Stage 2	Chooses correct meaning-bearing sentence pattern
Stage 3	Completes reason/sequence patterns meaningfully
Stage 4	Uses two patterns in connected response
Stage 5	Uses patterns flexibly in advice/explanation
Phrase/Sentence
Stage	Performance Description
Stage 1	Uses/completes routine phrase
Stage 2	Completes simple frames meaningfully
Stage 3	Expands short sentences with detail
Stage 4	Connects ideas using useful linkers
Stage 5	Adapts sentences for purpose/audience
Listening
Stage	Performance Description
Stage 1	Follows simple oral instruction
Stage 2	Gets details from short oral input
Stage 3	Understands sequence/reason in short oral text
Stage 4	Infers feeling/reason and uses clue
Stage 5	Responds to viewpoint with own response
Speaking
Stage	Performance Description
Stage 1	Names pictures or gives word/phrase
Stage 2	Answers familiar questions
Stage 3	Describes picture in connected sentences
Stage 4	Explains with reason/example
Stage 5	Gives opinion and follow-up response
Reading
Stage	Performance Description
Stage 1	Connects printed words with meaning
Stage 2	Answers sentence-level detail
Stage 3	Gets main idea/details from short text
Stage 4	Infers with evidence
Stage 5	Compares views and gives opinion
Writing
Stage	Performance Description
Stage 1	Labels and writes one sentence
Stage 2	Completes 2–3 meaningful frames
Stage 3	Writes 5–8 connected sentences
Stage 4	Writes paragraph with reason/example
Stage 5	Writes opinion with reasons/example
4. Support Codes

Support codes describe the type of support a student needed during the task.

Code	Meaning	AI Interpretation
Blank	No major support needed / independent enough	Student completed the task independently enough. No support code needs to be recorded.
R	Repetition	Prompt or oral input was repeated once. No answer content was provided.
P	Picture/object support	Student used a picture, object, or gesture as support.
WB	Word bank	Student used provided vocabulary/word bank.
F	Frame support	Student used a sentence starter or response frame.
O	Options support	Student selected an answer from provided options.
G	Gesture/recognition only	Student pointed/matched but could not produce the answer.
NR	No valid response	Student gave no response or an unrelated response after allowed support.
Important Support-Code Rule

A support code does not automatically mean the student failed the skill.

The code indicates the conditions under which the student demonstrated the skill.

Examples:

Stage 3 + F = Stage 3 performance demonstrated with frame support.
Stage 3 + WB = Stage 3 performance demonstrated with vocabulary support.
Stage 2 + Blank = Stage 2 performance demonstrated independently enough.
Stage 1 + G = Recognition demonstrated, but productive language was not demonstrated.
5. Oral Participation Flags

Oral participation flags describe how independently and confidently the student produced an oral response.

Flag	Meaning	AI Interpretation
C0	Freezes/refuses/no valid oral attempt	No valid oral production occurred.
C1	Whispers or gives only one-word response	Very limited oral production/confidence.
C2	Speaks after rehearsal/support	Oral production occurs with preparation or support.
C3	Speaks independently/confidently	Independent and confident oral production.
Oral Participation Scale

From lowest to highest oral participation:

C0 → C1 → C2 → C3

C0 = No valid attempt
C1 = Minimal production
C2 = Supported/rehearsed production
C3 = Independent/confident production
6. Result Code Format

Student results may contain:

Domain + Stage + Support Code + Oral Flag

Examples:

V:3:F

V = Vocabulary
3 = Stage 3
F = Frame support

W:2:WB

W = Writing
2 = Stage 2
WB = Word-bank support

S:3:P:C2

S = Speaking
3 = Stage 3
P = Picture/object support
C2 = Speaks after rehearsal/support

S:2:Blank:C3

S = Speaking
2 = Stage 2
Blank = No major support needed
C3 = Speaks independently/confidently



10. Core Data Model

The AI should conceptually treat each assessment record as:

Student
  └── Domain
       ├── Stage: 1–5
       ├── SupportCode: Blank | R | P | WB | F | O | G | NR
       └── OralFlag: C0 | C1 | C2 | C3 | optional

Class-Level Data Model

Class-level analysis should aggregate these records:

Class
  └── Students
       └── Assessment Records
            ├── Domain
            ├── Stage
            ├── SupportCode
            └── OralFlag



