// StudyMate AI - JavaScript


// ==============================
// Scroll to Study Planner
// ==============================

function scrollToPlanner() {

    document.getElementById("planner").scrollIntoView({
        behavior: "smooth"
    });

}


// ==============================
// Generate Study Plan
// ==============================

async function generatePlan() {

    const subject =
        document.getElementById("subject").value.trim();

    const topicInput =
        document.getElementById("topic").value.trim();

    const hours =
        document.getElementById("hours").value;

    const goal =
        document.getElementById("goal").value;


    // ==============================
    // Check required fields
    // ==============================

    if (
        subject === "" ||
        hours === "" ||
        goal === ""
    ) {

        alert("Please fill in the Subject, Study Hours, and Learning Goal.");

        return;
    }


    // ==============================
    // Process Topics
    // ==============================

    let topics = [];


    if (topicInput !== "") {

        topics = topicInput
            .split(/\n|,/)
            .map(function(topic) {

                return topic.trim();

            })
            .filter(function(topic) {

                return topic !== "";

            });

    }


    // ==============================
    // Create Topic Description
    // ==============================

    let topicText = "";


    if (topics.length === 0) {

        topicText =
            "No specific topics were provided. Create a study plan covering the whole subject.";

    } else {

        topicText =
            topics.join(", ");

    }


    const result =
        document.getElementById("result");

    const planContent =
        document.getElementById("planContent");


    // ==============================
    // Show Result Section
    // ==============================

    result.classList.remove("d-none");


    // ==============================
    // Loading Message
    // ==============================

    planContent.innerHTML = `

        <div class="text-center py-4">

            <div
                class="spinner-border text-primary"
                role="status">
            </div>

            <p class="mt-3">
                🤖 StudyMate AI is creating your personalized study plan...
            </p>

        </div>

    `;


    // ==============================
    // Scroll to Result
    // ==============================

    result.scrollIntoView({
        behavior: "smooth"
    });


    // ==============================
    // Convert Goal
    // ==============================

    let goalText = "";


    if (goal === "understand") {

        goalText =
            "Understand the concept clearly";

    } else if (goal === "practice") {

        goalText =
            "Practice and solve questions";

    } else if (goal === "exam") {

        goalText =
            "Prepare for an exam";

    } else if (goal === "apply") {

        goalText =
            "Apply the knowledge in practical situations";

    }


    // ==============================
    // Send Request to Backend
    // ==============================

    try {

        const response = await fetch(
            "/api/generate-plan",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    subject: subject,

                    topic: topicText,

                    topics: topics,

                    hours: hours,

                    goal: goalText

                })
            }
        );


        const data =
            await response.json();


        // ==============================
        // Check Server Response
        // ==============================

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to generate study plan."
            );

        }


        // ==============================
        // Topic Display
        // ==============================

        let topicDisplay = "";


        if (topics.length === 0) {

            topicDisplay = `

                <p>
                    <strong>Study Scope:</strong>
                    Whole Subject
                </p>

            `;

        } else {

            topicDisplay = `

                <p>
                    <strong>Specific Topics:</strong>
                </p>

                <ul>

            `;


            topics.forEach(function(topic) {

                topicDisplay += `

                    <li>
                        ${formatInline(topic)}
                    </li>

                `;

            });


            topicDisplay += `

                </ul>

            `;

        }


        // ==============================
        // Display AI Result
        // ==============================

        planContent.innerHTML = `

            <div class="alert alert-primary">

                <h4>
                    📚 ${formatInline(subject)}
                </h4>

                ${topicDisplay}

                <p>
                    <strong>Available Time:</strong>
                    ${hours} hours per week
                </p>

                <p>
                    <strong>Learning Goal:</strong>
                    ${formatInline(goalText)}
                </p>

            </div>


            <div class="mt-4">

                ${formatAIResponse(data.plan)}

            </div>

        `;


    } catch (error) {

        console.error("Error:", error);


        // ==============================
        // Error Message
        // ==============================

        planContent.innerHTML = `

            <div class="alert alert-danger">

                <h4>
                    ❌ Something went wrong
                </h4>

                <p>
                    ${error.message}
                </p>

                <p>
                    Please make sure the
                    StudyMate AI server is running.
                </p>

            </div>

        `;

    }

}


// ==============================
// Format AI Response
// ==============================

function formatAIResponse(text) {

    let lines =
        text.split("\n");

    let html = "";

    let inList = false;

    let inTable = false;


    for (let i = 0; i < lines.length; i++) {

        let line =
            lines[i].trim();


        // Ignore empty lines
        if (line === "") {

            if (inList) {

                html += "</ul>";

                inList = false;

            }


            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }

            continue;
        }


        // ==============================
        // Horizontal Rule
        // ==============================

        if (line === "---") {

            if (inList) {

                html += "</ul>";

                inList = false;

            }


            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }


            html +=
                `<hr class="my-4">`;

            continue;
        }


        // ==============================
        // H5 Heading
        // ==============================

        if (line.startsWith("##### ")) {

            if (inList) {

                html += "</ul>";

                inList = false;

            }


            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }


            let heading =
                line.replace(/^##### /, "");


            html += `

                <h5 class="mt-4 mb-3 fw-bold text-primary">

                    ${formatInline(heading)}

                </h5>

            `;

            continue;
        }


        // ==============================
        // H4 Heading
        // ==============================

        if (line.startsWith("#### ")) {

            if (inList) {

                html += "</ul>";

                inList = false;

            }


            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }


            let heading =
                line.replace(/^#### /, "");


            html += `

                <h4 class="mt-4 mb-3 fw-bold text-primary">

                    ${formatInline(heading)}

                </h4>

            `;

            continue;
        }


        // ==============================
        // H3 Heading
        // ==============================

        if (line.startsWith("### ")) {

            if (inList) {

                html += "</ul>";

                inList = false;

            }


            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }


            let heading =
                line.replace(/^### /, "");


            html += `

                <h5 class="mt-4 mb-3 fw-bold text-primary">

                    ${formatInline(heading)}

                </h5>

            `;

            continue;
        }


        // ==============================
        // Markdown Table
        // ==============================

        if (
            line.startsWith("|") &&
            line.endsWith("|")
        ) {

            let cells =
                line
                    .split("|")
                    .slice(1, -1)
                    .map(function(cell) {

                        return cell.trim();

                    });


            // Ignore table separator row
            if (
                cells.length > 0 &&
                cells.every(function(cell) {

                    return /^:?-+:?$/.test(cell);

                })
            ) {

                continue;

            }


            // Start table
            if (!inTable) {

                if (inList) {

                    html += "</ul>";

                    inList = false;

                }


                html += `

                    <div class="table-responsive mt-3 mb-4">

                        <table class="table table-bordered table-striped table-hover">

                            <thead class="table-primary">

                                <tr>

                `;


                cells.forEach(function(cell) {

                    html += `

                        <th>
                            ${formatInline(cell)}
                        </th>

                    `;

                });


                html += `

                                </tr>

                            </thead>

                            <tbody>

                `;


                inTable = true;

            } else {

                // Add table row

                html += "<tr>";


                cells.forEach(function(cell) {

                    html += `

                        <td>
                            ${formatInline(cell)}
                        </td>

                    `;

                });


                html += "</tr>";

            }


            continue;
        }


        // ==============================
        // Bullet List
        // ==============================

        if (line.startsWith("* ")) {

            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }


            if (!inList) {

                html += `

                    <ul class="mb-3">

                `;

                inList = true;

            }


            let bullet =
                line.replace(/^\* /, "");


            html += `

                <li class="mb-2">

                    ${formatInline(bullet)}

                </li>

            `;

            continue;
        }


        // ==============================
        // Numbered List
        // ==============================

        if (/^\d+\.\s/.test(line)) {

            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }


            if (inList) {

                html += "</ul>";

                inList = false;

            }


            let numberText =
                line.replace(/^\d+\.\s/, "");


            html += `

                <p class="mb-2">

                    <strong>
                        ${formatInline(numberText)}
                    </strong>

                </p>

            `;

            continue;
        }


        // ==============================
        // Blockquote
        // ==============================

        if (line.startsWith("> ")) {

            if (inList) {

                html += "</ul>";

                inList = false;

            }


            if (inTable) {

                html +=
                    "</tbody></table></div>";

                inTable = false;

            }


            let quote =
                line.replace(/^> /, "");


            html += `

                <div class="alert alert-light border-start border-primary border-4">

                    ${formatInline(quote)}

                </div>

            `;

            continue;
        }


        // ==============================
        // Normal Paragraph
        // ==============================

        if (inList) {

            html += "</ul>";

            inList = false;

        }


        if (inTable) {

            html +=
                "</tbody></table></div>";

            inTable = false;

        }


        html += `

            <p class="mb-3">

                ${formatInline(line)}

            </p>

        `;

    }


    // Close remaining list
    if (inList) {

        html += "</ul>";

    }


    // Close remaining table
    if (inTable) {

        html +=
            "</tbody></table></div>";

    }


    return html;
}


// ==============================
// Format Inline Text
// ==============================

function formatInline(text) {

    // --------------------------------
    // Clean common LaTeX math notation
    // --------------------------------

    text = text
        .replace(/\$\$(.*?)\$\$/g, "$1")
        .replace(/\$([^$]+)\$/g, "$1")
        .replace(/\\pm/g, "±")
        .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
        .replace(
            /\\frac\{([^}]+)\}\{([^}]+)\}/g,
            "($1) / ($2)"
        )
        .replace(/\^2/g, "²")
        .replace(/\^3/g, "³")
        .replace(
            /\^([0-9]+)/g,
            "<sup>$1</sup>"
        );


    // --------------------------------
    // Bold text
    // --------------------------------

    text = text.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    // --------------------------------
    // Italic text
    // --------------------------------

    text = text.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );


    return text;
}