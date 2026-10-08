const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Get Gemini API key from Windows Environment Variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Main and backup models
const MAIN_MODEL = "gemini-3.8-flash";
const BACKUP_MODEL = "gemini-3.7-flash";

// Serve frontend files
app.use(express.static(path.join(__dirname)));
app.use(express.json());


// ==========================================
// Wait Function
// ==========================================

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ==========================================
// Call Gemini API with Retry
// ==========================================

async function callGemini(model, prompt) {

    const maxRetries = 3;

    for (
        let attempt = 1;
        attempt <= maxRetries;
        attempt++
    ) {

        console.log(
            `Trying ${model} - Attempt ${attempt}/${maxRetries}`
        );


        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    contents: [

                        {

                            parts: [

                                {
                                    text: prompt
                                }

                            ]

                        }

                    ]

                })

            }
        );


        const data =
            await response.json();


        // Successful response

        if (response.ok) {

            console.log(
                `Success with ${model}`
            );

            return data;

        }


        // Retry temporary errors

        if (
            response.status === 503 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 504 ||
            response.status === 429
        ) {

           console.log(
    `${model} returned ${response.status}. Retrying...`
);

console.error(
    "Gemini temporary error details:",
    data
);

            if (attempt < maxRetries) {

                const delay =
                    Math.pow(2, attempt) * 1000;


                console.log(
                    `Waiting ${delay / 1000} seconds before retry...`
                );


                await wait(delay);

            }

        } else {

            // Non-retryable error

            console.error(
                "Gemini API Error:",
                data
            );


            throw {

                status: response.status,

                data: data

            };

        }

    }


    // All retries failed

    throw {

        status: 503,

        data: {

            error: {

                message:
                    `${model} is temporarily unavailable.`

            }

        }

    };

}


// ==========================================
// EXISTING STUDY PLANNER API
// ==========================================

app.post(
    "/api/generate-plan",
    async (req, res) => {

        try {

            const {
                subject,
                topic,
                topics,
                hours,
                goal
            } = req.body;


            // Check required fields

            if (
                !subject ||
                !hours ||
                !goal
            ) {

                return res.status(400).json({

                    error:
                        "Please provide the subject, study hours, and learning goal."

                });

            }


            // Check API key

            if (!GEMINI_API_KEY) {

                return res.status(500).json({

                    error:
                        "Gemini API key is not configured."

                });

            }


            // Process topics

            let topicList = [];


            if (Array.isArray(topics)) {

                topicList =
                    topics
                        .map(function(item) {

                            return String(item).trim();

                        })
                        .filter(function(item) {

                            return item !== "";

                        });

            }


            // Backup support for topic text

            if (
                topicList.length === 0 &&
                typeof topic === "string" &&
                topic.trim() !== ""
            ) {

                topicList =
                    topic
                        .split(/\n|,/)
                        .map(function(item) {

                            return item.trim();

                        })
                        .filter(function(item) {

                            return item !== "";

                        });

            }


            // Determine study scope

            let studyScope = "";

            let topicInstructions = "";


            if (topicList.length === 0) {

                studyScope =
                    "WHOLE SUBJECT";


                topicInstructions = `

The student did not provide any specific difficult topics.

Create a study plan that covers the important areas of the
whole subject.

Do not invent a list of difficult topics from the student.
Instead, organize the subject from foundational concepts
to more advanced concepts in a logical learning order.

`;

            } else if (topicList.length === 1) {

                studyScope =
                    "ONE SPECIFIC TOPIC";


                topicInstructions = `

The student has provided one specific topic.

Focus the study plan mainly on this topic while including
any necessary prerequisite concepts.

`;

            } else {

                studyScope =
                    "MULTIPLE SPECIFIC TOPICS";


                topicInstructions = `

The student has provided multiple specific topics.

Include ALL of the provided topics in the study plan.

Do not ignore any topic.

Prioritize the topics logically based on:

- Difficulty
- Importance
- Prerequisite relationships
- The student's learning goal

Distribute the available study time across the topics
realistically.

Do not spend all the available time on only one topic.

`;

            }


            // Format topic list

            let topicInformation = "";


            if (topicList.length === 0) {

                topicInformation =
                    "No specific topics provided.";

            } else {

                topicInformation =
                    topicList
                        .map(function(item, index) {

                            return `${index + 1}. ${item}`;

                        })
                        .join("\n");

            }


            // AI Prompt

            const prompt = `

You are StudyMate AI, an educational study planning assistant.

Create a personalized study plan for a student.

Subject:
${subject}

Study Scope:
${studyScope}

Specific Topics:
${topicInformation}

Available Study Hours Per Week:
${hours}

Learning Goal:
${goal}

${topicInstructions}

The student should learn by:

- Understanding concepts
- Making connections
- Practicing
- Applying knowledge

Important planning rules:

1. Respect the available study hours.
2. Make the plan realistic for a student.
3. Do not overload the student.
4. If multiple topics are provided, include ALL of them.
5. If multiple topics are provided, distribute study time
   sensibly between them.
6. If no specific topics are provided, create a plan for the
   whole subject.
7. Consider prerequisite concepts when deciding the learning order.
8. Match the plan to the student's learning goal.
9. Include revision and practice where appropriate.
10. Include short breaks where appropriate.
11. Keep the language simple and beginner-friendly.

Create the response with these sections:

### 1. Understand the Concept

Explain what the student should learn first and why.

### 2. Make Connections

Show how the concepts or topics are connected.

### 3. Practice & Apply

Suggest practical activities, exercises, questions, or
applications.

### 4. Weekly Study Plan

Create a realistic Monday-to-Sunday study schedule.

Use the available ${hours} hours per week.

Include:

- Day
- Study topic
- Activity
- Approximate time

If multiple topics were provided, make sure all topics
appear in the weekly plan.

### 5. StudyMate Tip

Give one useful study tip that matches the student's
learning goal.

Use simple English.

Make the plan clear, practical, personalized, and
beginner-friendly.

`;


            // Call main model

            let data;


            try {

                data =
                    await callGemini(
                        MAIN_MODEL,
                        prompt
                    );

            } catch (mainError) {

                console.log(
                    `${MAIN_MODEL} failed after retries.`
                );


                console.log(
                    "Trying backup model..."
                );


                try {

                    data =
                        await callGemini(
                            BACKUP_MODEL,
                            prompt
                        );

                } catch (backupError) {

                    console.error(
                        "Both Gemini models failed.",
                        backupError
                    );


                    return res.status(503).json({

                        error:
                            "StudyMate AI is temporarily busy. Please try again in a moment."

                    });

                }

            }


            // Get AI text

            const aiText =
                data.candidates?.[0]?.content?.parts?.[0]?.text ||
                "No AI response received.";


            // Send result

            res.json({

                success: true,

                plan: aiText

            });


        } catch (error) {

            console.error(
                "Study Planner Server Error:",
                error
            );


            res.status(500).json({

                error:
                    "Something went wrong while creating your study plan."

            });

        }

    }
);



// ==========================================
// NEW EXAM PLANNER API
// ==========================================

app.post(
    "/api/generate-exam-plan",
    async (req, res) => {

        try {

            const {
                subjects
            } = req.body;


            // ======================================
            // Check API Key
            // ======================================

            if (!GEMINI_API_KEY) {

                return res.status(500).json({

                    error:
                        "Gemini API key is not configured."

                });

            }


            // ======================================
            // Validate Subjects
            // ======================================

            if (
                !Array.isArray(subjects) ||
                subjects.length === 0
            ) {

                return res.status(400).json({

                    error:
                        "Please provide at least one subject."

                });

            }


            // ======================================
            // Prepare Subject Information
            // ======================================

            let subjectInformation = "";


            subjects.forEach(
                function(subject, index) {

                    let topicInformation =
                        "No specific topics provided.";


                    if (
                        Array.isArray(subject.topics) &&
                        subject.topics.length > 0
                    ) {

                        topicInformation =
                            subject.topics.join(", ");

                    }


                    subjectInformation += `

Subject ${index + 1}

Subject Name:
${subject.name}

Exam Date:
${subject.examDate}

Days Remaining:
${subject.daysRemaining}

Specific Topics:
${topicInformation}

--------------------------------

`;

                }
            );



            // ======================================
            // Find Nearest Exam
            // ======================================

            let nearestSubject =
                subjects[0];


            subjects.forEach(
                function(subject) {

                    if (
                        Number(subject.daysRemaining) <
                        Number(nearestSubject.daysRemaining)
                    ) {

                        nearestSubject =
                            subject;

                    }

                }
            );



            // ======================================
            // Exam Planner AI Prompt
            // ======================================

            const prompt = `

You are StudyMate AI, an educational exam planning assistant.

Create a personalized exam preparation plan for a student.

The student has multiple subjects and each subject has its
own exam date.

IMPORTANT:

Do NOT ask the student for available study hours.

Do NOT assign exact study hours.

Instead, create a realistic preparation sequence based on
the number of days available before each exam.

Here is the student's exam information:

${subjectInformation}


Nearest upcoming exam:

${nearestSubject.name}

Exam Date:
${nearestSubject.examDate}

Days Remaining:
${nearestSubject.daysRemaining}


IMPORTANT PLANNING RULES:

1. Include EVERY subject.

2. Include EVERY specific topic provided by the student.

3. If a subject has no specific topics, identify important
   areas of that subject that should be reviewed.

4. Give higher priority to subjects whose exams are sooner.

5. Consider the difficulty and importance of subjects.

6. Do not ignore subjects with later exam dates.

7. Organize the preparation logically.

8. Start with understanding and learning.

9. Then include practice.

10. Include revision.

11. Include exam-style questions or mock practice.

12. In the final days before each exam, focus more on
    revision, weak areas, and exam practice.

13. After an earlier exam is completed, the student can
    focus more strongly on the next upcoming subject.

14. Do not overload the student.

15. Use simple English.

16. Make the plan practical and easy for a student to follow.

17. Do not invent specific syllabus topics when the student
    did not provide them. If topics are missing, clearly say
    that the AI is recommending important general areas.

18. Use the actual exam dates provided by the student.

19. Do not change or invent exam dates.

20. The plan should help the student prepare from today
    until the final exam.


Create the response using these sections:


### 1. Exam Preparation Overview

Explain:

- Number of subjects
- Nearest exam
- Overall preparation strategy


### 2. Subject Priorities

List all subjects.

Explain which subjects should receive earlier attention
and why, based mainly on exam dates and preparation needs.


### 3. Important Topics

For each subject:

- Show the topics provided by the student.
- If no topics were provided, identify important general
  areas to review without pretending they came from the
  student's syllabus.


### 4. Exam Preparation Schedule

Create a practical day-by-day preparation plan.

Use:

Day 1
Day 2
Day 3
...

Continue until the final exam.

Make sure the plan gives priority to the nearest exams.

If there are many days, group similar days into phases when
a full day-by-day schedule would become unnecessarily long.

Make sure every subject receives preparation.


### 5. Revision & Practice Strategy

Explain:

- How to revise
- How to practice
- How to identify weak areas
- How to use exam-style questions


### 6. Final Preparation

Explain what the student should do during the final days
before each exam.

Focus on:

- Revision
- Weak areas
- Practice questions
- Mock exams
- Important concepts


### 7. StudyMate Tip

Give one useful and practical exam preparation tip.


Remember:

- Include ALL subjects.
- Include ALL provided topics.
- Respect ALL exam dates.
- Prioritize earlier exams.
- Do NOT ask for study hours.
- Do NOT assign exact study hours.
- Keep the plan realistic.
- Use simple English.
- Make the plan clear and beginner-friendly.

`;



            // ======================================
            // Call Main Gemini Model
            // ======================================

            let data;


            try {

                data =
                    await callGemini(
                        MAIN_MODEL,
                        prompt
                    );

            } catch (mainError) {

                console.log(
                    `${MAIN_MODEL} failed for Exam Planner after retries.`
                );


                console.log(
                    "Trying backup model for Exam Planner..."
                );


                // ==================================
                // Backup Model
                // ==================================

                try {

                    data =
                        await callGemini(
                            BACKUP_MODEL,
                            prompt
                        );

                } catch (backupError) {

                    console.error(
                        "Both Gemini models failed for Exam Planner.",
                        backupError
                    );


                    return res.status(503).json({

                        error:
                            "StudyMate AI is temporarily busy. Please try again in a moment."

                    });

                }

            }



            // ======================================
            // Get AI Response
            // ======================================

            const aiText =
                data.candidates?.[0]?.content?.parts?.[0]?.text ||
                "No AI response received.";



            // ======================================
            // Send Exam Plan
            // ======================================

            res.json({

                success: true,

                plan: aiText

            });


        } catch (error) {

            console.error(
                "Exam Planner Server Error:",
                error
            );


            res.status(500).json({

                error:
                    "Something went wrong while creating the exam study plan."

            });

        }

    }
);



// ==========================================
// Start Server
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            `StudyMate AI is running at http://localhost:${PORT}`
        );

    }
);