Baseline_assesment
Purpose

This sheet stores Lumino1 Student Baseline Assessment Details. It contains student information, item-level assessment scores, calculated stage information, review flags, support/oral participation information, and quality-control notes.

Student Information
Field	Description
Student_ID	Student identifier
Student_Name	Student name
School	School name
Grade	Grade
Class_Section	Class/section
Assessment_Date	Assessment date
Assessor	Assessor name
Status	Student assessment status
Assessment Domains

The baseline assessment contains 7 domains:

Vocabulary (V1–V5)
Grammar/Pattern (G1–G5)
Phrase/Sentence (P1–P5)
Listening (L1–L5)
Speaking (S1–S5)
Reading (R1–R5)
Writing (W1–W5)

Each domain contains 5 sequential item ratings, with each item scored from 0 to 4.

For each domain, the following fields are stored:

Item scores
Score
Suggested_Stage
Final_Stage
Review_Flag
Item Scores

Each item score must be a value from 0 to 4.

Example:

V1, V2, V3, V4, V5
4,  4,  4,  1,  1

Score

The domain score is the sum of its five item scores.

Score = Item1 + Item2 + Item3 + Item4 + Item5


The total score is calculated separately and does not determine the stage by itself.

Suggested Stage

The same stage progression rule is used for all seven domains.

Each domain has five sequential ratings:

R1, R2, R3, R4, R5


The suggested stage is the highest stage where:

The current stage rating is at least 3.
Every preceding stage rating is at least 2.

Evaluate from highest to lowest:

Suggested Stage	Rule
S5	R5 ≥ 3 and R1–R4 are all ≥ 2
S4	R4 ≥ 3 and R1–R3 are all ≥ 2
S3	R3 ≥ 3 and R1–R2 are all ≥ 2
S2	R2 ≥ 3 and R1 ≥ 2
S1	R1 ≥ 3
Review	None of the above conditions are met
Review Rule

Review Needed applies when a higher-level rating is ≥3 but one or more required preceding ratings is <2.

Review conditions:

R5 ≥ 3 and any of R1–R4 < 2
R4 ≥ 3 and any of R1–R3 < 2
R3 ≥ 3 and any of R1–R2 < 2
R2 ≥ 3 and R1 < 2
Suggested Stage = Review
Final Stage

The Final_Stage is teacher-reviewed.

Rules:

If Suggested_Stage is blank or Review, Final_Stage remains blank.
Otherwise, Final_Stage initially equals Suggested_Stage.
The teacher may subsequently review or override the final stage.
Missing Data Rule

If all five ratings for a domain are blank:

Calculated score remains blank.
Suggested stage remains blank.
Review flag remains blank.
Final stage remains blank.
Support and Oral Participation
Field	Description
Key_Support_Flag	Used only when support is needed, e.g. S:F; W:WB
Oral_Flag	Speaking participation/confidence flag: C0–C3
QC_Notes	Optional brief note
Profile_Key	Helper value in the format School | Class_Section
Key Support Flag

Support codes identify support used during assessment.

Examples:

S:F = Speaking with frame support
W:WB = Writing with word-bank support
Multiple support codes may be recorded in the same field.

The field should be used only when support is needed.

Oral Flag

Oral_Flag uses:

C0
C1
C2
C3

These flags represent speaking confidence/participation.

Profile Key

Profile_Key is a helper field generated from:

School | Class_Section


Example:

RS Vidya Mandir | A


The exact source fields should follow the workbook implementation.

Main Data Structure
Student
├── Student Information
├── Vocabulary
│   ├── V1–V5
│   ├── V_Score
│   ├── V_Suggested_Stage
│   ├── V_Final_Stage
│   └── V_Review_Flag
├── Grammar/Pattern
├── Phrase/Sentence
├── Listening
├── Speaking
├── Reading
├── Writing
├── Key_Support_Flag
├── Oral_Flag
├── QC_Notes
└── Profile_Key


The same assessment calculation logic applies to each domain.