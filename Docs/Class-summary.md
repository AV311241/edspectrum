Lumino1 Class Summary — Domain Distribution and SAS Map
Summary

This document describes the Lumino1 Class Summary: Domain Distribution and SAS Map.

The doc is contains a class-section-level view of student assessment performance. It filters assessment data according to the selected School and Class/Section, and summarizes how students are distributed across Stage 1 to Stage 5 for each assessment domain.

The document also records:

The number of students assessed.
Stage distribution for each domain.
The dominant stage for each domain.
The percentage of students performing below the dominant stage.
A review flag when more than 35% of students are below the dominant stage.
Manually entered Support, Anchor, and Stretch Bands.
Planning implications entered by the Head of Department.
Suggested framework families associated with each domain.
The relationship between the class-level assessment data and instructional planning.

Important: This document does not assume meanings for undefined acronyms or framework names. Items marked “To be confirmed” should be defined by the relevant academic/business owner.

1. Sheet Purpose

The Class Summary sheet provides a summary of assessment performance for one selected class-section.

The selected values are:

School: selected in cell B3
Class/Section: selected in cell B4

Example:

School: RS Vidya Mandir
Class/Section: 8A

8A represents Class 8, Section A.

The example values are only an example selection and should not be treated as permanent defaults.

2. Source Data and Filtering

The Class Summary is based on student-level assessment data from:

01_Individual_Entry

The summary should include only students who:

Match the selected School.
Match the selected Class/Section.
Are marked as Present.
Have been assessed.

Therefore, the summary represents the selected class-section rather than the entire school.

Example

If:

School = RS Vidya Mandir
Class/Section = 8A

then the Class Summary should use only the matching Present students from 01_Individual_Entry.

3. Total Assessed

Total Assessed represents the simple number of students who have been assessed for the selected class-section.

It should not be interpreted as:

Total students enrolled.
Total students in the school.
Total absent students.
Total students who were expected to be assessed.

It represents the number of students whose assessment data is included in the class summary.

4. Domain Distribution

The Class Summary contains seven assessment domains:

Vocabulary
Grammar/Pattern
Phrase/Sentence
Listening
Speaking
Reading
Writing

For each domain, the sheet records the number of students at each achievement stage.

Domain	S1	S2	S3	S4	S5	Total with Stage	Dominant Stage	% Below Dominant	Review Flag
Vocabulary									
Grammar/Pattern									
Phrase/Sentence									
Listening									
Speaking									
Reading									
Writing									
5. Stage Distribution

The columns S1 to S5 represent the number of assessed students who are at each stage for that domain.

S1 = Number of students at Stage 1.
S2 = Number of students at Stage 2.
S3 = Number of students at Stage 3.
S4 = Number of students at Stage 4.
S5 = Number of students at Stage 5.

These values show the distribution of students across achievement stages.

Example

Suppose 10 students have assessed Speaking results:

S1 = 0
S2 = 2
S3 = 5
S4 = 0
S5 = 3

The distribution is:

2 students at Stage 2
5 students at Stage 3
3 students at Stage 5
6. Total with Stage

Total with Stage represents the number of students who have a valid stage recorded for that domain.

Conceptually:

Total with Stage = S1 + S2 + S3 + S4 + S5


This value is used as the denominator for the % Below Dominant calculation.

If there are no students with a recorded stage for a domain, the percentage and review flag should remain blank.

7. Dominant Stage

The Dominant Stage is the stage with the highest number of students in that domain.

Example

For 10 students:

Stage	Students
S1	0
S2	2
S3	5
S4	0
S5	3

The Dominant Stage is S3 because S3 has the highest number of students.

Important Rule

The dominant stage is based on the largest student count, not the average stage.

For example:

S2 = 2 students
S3 = 5 students
S5 = 3 students

The dominant stage is S3, even though some students are at S5.

8. % Below Dominant

The % Below Dominant measures the proportion of students whose stage is lower than the dominant stage.

The calculation depends on which stage is dominant.

Calculation Logic

If the dominant stage is:

S1: 0% are below the dominant stage.
S2: S1 students / Total with Stage.
S3: S1 + S2 students / Total with Stage.
S4: S1 + S2 + S3 students / Total with Stage.
S5: S1 + S2 + S3 + S4 students / Total with Stage.

The Excel formula currently used is:

=IF(G8=0;"";CHOOSE(MATCH(H8;$B$7:$F$7;0);0;B8/G8;SUM(B8:C8)/G8;SUM(B8:D8)/G8;SUM(B8:E8)/G8))


Where:

G8 = Total with Stage
H8 = Dominant Stage
B8:F8 = S1:S5 counts
Example

If 10 students have:

S1 = 0
S2 = 2
S3 = 5
S4 = 0
S5 = 3

Dominant Stage = S3.

Students below S3:

S1 + S2 = 0 + 2 = 2


Therefore:

% Below Dominant = 2 / 10 = 20%

9. Review Flag

The Review Flag identifies domains where a relatively large proportion of students are performing below the dominant stage.

The current rule is:

If more than 35% of students are below the dominant stage, flag the domain for review.

The current Excel formula is:

=IF(I8="";"";IF(I8>0.35;"Review: >35% below dominant";"OK"))

Interpretation
% Below Dominant	Review Flag
Blank	Blank
35% or less	OK
More than 35%	Review: >35% below dominant
Important Boundary Rule

Exactly 35% is considered OK.

Only values greater than 35% receive the review flag.

For example:

20% → OK
35% → OK
35.1% → Review: >35% below dominant
50% → Review: >35% below dominant

11. Support, Anchor and Stretch Bands

The Class Summary contains three manually maintained planning fields:

Domain	Support Band	Anchor Band	Stretch Band
Vocabulary	Manual	Manual	Manual
Grammar/Pattern	Manual	Manual	Manual
Phrase/Sentence	Manual	Manual	Manual
Listening	Manual	Manual	Manual
Speaking	Manual	Manual	Manual
Reading	Manual	Manual	Manual
Writing	Manual	Manual	Manual

These bands are manually entered by the Head of Department (HOD).

The HOD determines the appropriate Support, Anchor, and Stretch Bands according to their professional/academic understanding of the class and domain data.

The AI should therefore treat these fields as expert-entered planning information, not as automatically calculated values.

Important Rule

The AI should not automatically assign Support, Anchor, or Stretch Bands unless the HOD has explicitly provided rules for doing so.

12. Planning Implication

The Planning Implication field is also manually maintained.

It is intended to capture the instructional implication of the class-level domain pattern.

The HOD determines what planning implication is appropriate based on:

Stage distribution.
Dominant Stage.
Percentage below dominant.
Review Flag.
Support/Anchor/Stretch Bands.
Other professional knowledge about the class.

The AI may help interpret or explain the planning implication, but should not overwrite the HOD's professional judgment unless explicitly instructed.

13. Suggested Framework Family

The sheet contains a Suggested Framework Family for each domain.

Domain	Suggested Framework Family
Vocabulary	MEU / Functional Phonics / RRI
Grammar/Pattern	NPU / RRI
Phrase/Sentence	FEC / RRI
Listening	3L / RRI
Speaking	PRSP / RRI
Reading	PERC / LIT / RRI
Writing	IWDR / RRI

The following framework names/acronyms have been provided in the spreadsheet but their definitions have not yet been supplied:

MEU
Functional Phonics
RRI
NPU
FEC
3L
PRSP
PERC
LIT
IWDR
AI Rule

