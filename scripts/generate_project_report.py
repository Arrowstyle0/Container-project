from pathlib import Path
from datetime import date
import textwrap
import zipfile
import html

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)

project_files = {
    "Backend Server": "server/index.js",
    "Goal Model": "server/models/Goal.js",
    "Todo Model": "server/models/Todo.js",
    "Application Router": "src/App.jsx",
    "Dashboard Shell": "src/pages/Dashboard.jsx",
    "Dashboard Overview Page": "src/pages/DashboardOverview.jsx",
    "Goals Page": "src/pages/Goals.jsx",
    "Todos Page": "src/pages/Todos.jsx",
    "Goal List Component": "src/components/dashboard/GoalList.jsx",
    "Add Goal Component": "src/components/dashboard/AddGoal.jsx",
    "Todo List Component": "src/components/dashboard/TodoList.jsx",
    "Sidebar": "src/components/layout/Sidebar.jsx",
    "User Onboarding Modal": "src/components/ui/UserOnboarding.jsx",
    "README": "README.md",
    "Package Manifest": "package.json",
}


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def file_tree() -> str:
    return "\n".join(
        [
            "Goal/",
            "├── server/",
            "│   ├── index.js",
            "│   └── models/",
            "│       ├── Goal.js",
            "│       └── Todo.js",
            "├── src/",
            "│   ├── components/",
            "│   │   ├── dashboard/",
            "│   │   ├── layout/",
            "│   │   └── ui/",
            "│   ├── pages/",
            "│   ├── App.jsx",
            "│   └── main.jsx",
            "├── public/",
            "├── README.md",
            "└── package.json",
        ]
    )


long_problem_analysis = """
Modern students, professionals, and creators usually face the same execution gap: they know what they want to achieve, but they do not have a simple, low-friction system that keeps goals and tasks connected in one workflow.

Most users either rely on plain to-do lists that lack strategic context, or they use complex project management tools that are too heavy for personal productivity. This application addresses the middle ground. It combines higher-level goal planning and day-level task execution in a single dashboard.

The problem solved by the project can be framed in five concrete pain points:

1. Fragmented planning systems: goals are captured in one place while tasks are tracked in another, leading to context switching and weak follow-through.
2. Lack of progress visibility: users can add tasks but cannot easily evaluate whether they are progressing toward meaningful outcomes.
3. Weak motivation loops: in the absence of visual progress analytics, users struggle to maintain momentum over multiple days.
4. High setup overhead in enterprise tools: many productivity platforms require complex onboarding and configurations that discourage routine use.
5. Inconsistent habit reinforcement: users need immediate feedback (completed goals, pending tasks, activity trend) to sustain daily discipline.

The Goal Tracker App solves these issues by unifying:
- Goal lifecycle management (create, update, complete, delete)
- Daily task management (quick add, check-off, delete)
- Dashboard analytics (goal completion, pending tasks, seven-day trend)
- Lightweight onboarding through username persistence in local storage

In practical terms, this project offers a focused personal command center: the user can set long-term intent and execute short-term action without leaving the application.
""".strip()

sections = [
    ("Executive Summary", """
This report presents a complete technical and functional analysis of the Goal Tracker application. The app is a full-stack productivity platform that helps users define goals, execute daily tasks, and monitor progress through a real-time dashboard. The frontend is implemented with React and Vite, while the backend uses Express and MongoDB through Mongoose.

The report covers project objectives, architecture, data model, API design, frontend structure, backend workflow, technology stack rationale, deployment concerns, quality attributes, future improvements, and a rich appendix of source code excerpts for learning and maintainability.

Because this report is intended as an academic/professional project document, it is structured for 20-30 pages in a Word-compatible format. The writing includes both high-level narrative and low-level implementation details so that readers from both management and engineering backgrounds can understand the system.
"""),
    ("1. Project Overview", """
The Goal Tracker project is designed as a daily productivity workspace for personal users. It is centered on a simple flow:
1) capture goals,
2) break them into actionable tasks,
3) track completion,
4) review progress over time.

The system is intentionally minimal yet complete. It includes user-oriented features such as welcoming onboarding, route-based dashboard pages, cards for key metrics, trend charts, and focused list interfaces for goals and todos.

Unlike many tutorial-grade projects that only demonstrate CRUD operations, this application introduces an integrated experience where backend analytics endpoints are consumed by frontend visualizations to close the feedback loop for users.
"""),
    ("2. Problem Statement and Proposed Solution", long_problem_analysis),
    ("3. Objectives and Scope", """
Primary objectives:
- Deliver a full-stack web app for personal productivity management.
- Provide clear separation of concerns between frontend views and backend API logic.
- Persist data in a durable, queryable store (MongoDB).
- Offer actionable analytics via dashboard statistics and history.
- Keep onboarding friction low via local username persistence.

Scope included in the project:
- Goal management module.
- Todo management module.
- Dashboard overview with trend chart and progress indicators.
- REST APIs for CRUD and analytics.
- Responsive and modern user interface.

Scope intentionally excluded (for future releases):
- Multi-user authentication and authorization.
- Role-based permissions.
- Team collaboration features.
- Notification scheduling engine.
- Offline-first synchronization.
"""),
    ("4. Technology Stack", """
Frontend:
- React 19 for component-based UI architecture.
- React Router for page routing and nested layouts.
- Recharts for analytics visualization.
- Tailwind CSS utility-driven styling and UI consistency.
- Lucide React iconography for modern visual semantics.
- Vite for rapid development server and optimized build output.

Backend:
- Node.js runtime for JavaScript-based server execution.
- Express 5 for HTTP APIs and middleware control.
- Mongoose for schema definitions, validation, and MongoDB access.
- CORS middleware for browser compatibility.
- dotenv for environment-based configuration.

Database:
- MongoDB for flexible document persistence of goals and tasks.

Developer Tooling:
- ESLint for linting.
- PostCSS + Tailwind plugins for CSS processing.
- npm scripts for build/start/dev lifecycle automation.
"""),
    ("5. System Architecture", """
The architecture follows a classic client-server model:

- Client Layer (React): renders pages, fetches API data, handles user interactions.
- API Layer (Express): validates request context, performs business logic, returns JSON responses.
- Data Layer (MongoDB via Mongoose): stores goals and todos with timestamp metadata.

Data flow example for dashboard:
1) DashboardOverview page mounts and reads current username.
2) It requests /api/dashboard/stats and /api/dashboard/history.
3) Server aggregates counts and computes 7-day activity snapshots.
4) Frontend updates state and renders cards + area chart.

This flow demonstrates a clean boundary: presentation logic remains on frontend, while aggregation and persistence logic live in backend routes.
"""),
    ("6. Module-Level Design", """
A. Landing and Navigation Module
- Landing page introduces the product value proposition.
- Navbar/Hero components emphasize accessibility and visual clarity.

B. Dashboard Shell Module
- Dashboard layout hosts Sidebar + Header + nested content.
- User onboarding modal appears when username is unavailable.
- Username is persisted in localStorage for session continuity.

C. Goals Module
- AddGoal component captures new goals.
- GoalList fetches and displays existing goals.
- Update/delete operations keep collection current.

D. Todos Module
- TodoList supports task creation, completion toggling, and deletion.
- Fast interaction model designed for daily usage.

E. Analytics Module
- Stats endpoint computes aggregate counts for goals and tasks.
- History endpoint computes per-day activity distribution.
- Frontend cards and charts provide immediate insight.
"""),
    ("7. Data Model", """
The project uses two core entities:

Goal entity:
- username: String (user ownership context)
- title: String (goal name)
- description: String (detail text)
- deadline: Date (target completion date)
- status: String enum-like value (e.g., In Progress, Completed)
- timestamps: createdAt, updatedAt

Todo entity:
- username: String (user ownership context)
- text: String (task body)
- completed: Boolean (done/pending state)
- timestamps: createdAt, updatedAt

Design rationale:
- Username-based partitioning keeps model simple without auth complexity.
- Timestamp fields enable meaningful history analytics.
- Separate collections for goals and todos support independent growth.
"""),
    ("8. API Design and Endpoint Documentation", """
Goals API:
- GET /api/goals?username=... : list goals for user
- POST /api/goals : create goal
- PUT /api/goals/:id : edit goal
- DELETE /api/goals/:id : remove goal

Todos API:
- GET /api/todos?username=... : list todos for user
- POST /api/todos : create todo
- PUT /api/todos/:id : update todo
- DELETE /api/todos/:id : remove todo

Dashboard API:
- GET /api/dashboard/stats?username=... : returns goals/todos aggregate counts
- GET /api/dashboard/history?username=... : returns 7-day goals/tasks activity

Error handling strategy:
- 400 for missing input or invalid updates.
- 500 for unexpected server/database failures.
- JSON error responses to keep frontend behavior predictable.
"""),
    ("9. Frontend Implementation Details", """
The frontend uses route segmentation for maintainability:
- / : public landing page
- /dashboard : authenticated-like shell for productivity modules
- /dashboard/goals : goal management screen
- /dashboard/todos : todo management screen

State handling is component-local using React hooks, which is adequate for current scale and avoids unnecessary complexity from global stores.

The DashboardOverview page demonstrates asynchronous orchestration of multiple API calls, loading management, derived metric calculation, and dynamic chart rendering.

UI decisions prioritize readability: cards, spacing, neutral backgrounds, and clear typography make daily review comfortable.
"""),
    ("10. Backend Implementation Details", """
The backend initializes configuration using dotenv, connects to MongoDB via Mongoose, then mounts middleware and API routes.

Important implementation traits:
- express.json() parses incoming request bodies.
- cors() allows browser-origin requests during development.
- Static serving from /dist supports production deployment of built frontend.
- Catch-all route returns index.html to enable client-side routing refresh behavior.

Analytics route logic includes lightweight aggregation:
- countDocuments() for totals and segmented categories.
- Date filtering on updatedAt for history calculations.
- Structured response format aligned with frontend graph and card needs.
"""),
    ("11. Security, Performance, and Reliability Considerations", """
Current strengths:
- Environment variables isolate sensitive connection configuration.
- JSON APIs and schema-backed models reduce malformed data risk.
- Simplicity reduces attack surface in comparison with over-abstracted systems.

Improvement opportunities:
- Add authentication (JWT/session) and per-user authorization checks.
- Add input validation middleware (e.g., Zod/Joi) for stricter constraints.
- Introduce pagination or cursor queries for large datasets.
- Add rate limiting and security headers (helmet) in production.
- Replace console-only error handling with structured logging.
"""),
    ("12. Testing Strategy Recommendation", """
Although this repository is primarily implementation-focused, a production-grade testing strategy should include:

Unit tests:
- Model validation and helper functions.

Integration tests:
- API endpoint behavior against a test database.

UI tests:
- Critical flows such as add goal, mark todo complete, dashboard load.

End-to-end tests:
- Browser automation to validate full user journeys.

Non-functional checks:
- Lighthouse performance audits.
- API response timing under synthetic load.
"""),
    ("13. Deployment and Operations Notes", """
Recommended deployment pipeline:
1. Build frontend assets with vite build.
2. Start Node server to serve APIs + static dist.
3. Configure environment secrets securely.
4. Use managed MongoDB (Atlas) for high availability.
5. Add monitoring dashboards and alerting thresholds.

Operational best practices:
- Keep dependency versions pinned and audited.
- Maintain separate staging and production environments.
- Use backup and restore policy for MongoDB data.
"""),
    ("14. Future Roadmap", """
Potential feature upgrades:
- User authentication and profile management.
- Tags, priorities, and recurring tasks.
- Goal milestones and progress percentages per goal.
- Calendar view and reminder notifications.
- Export reports (PDF/CSV) from dashboard analytics.
- AI-assisted task decomposition and planning suggestions.

Engineering roadmap:
- Introduce service and repository layers in backend for scale.
- Add TypeScript migration path for stronger type safety.
- Add CI pipeline with lint/test/build gates.
"""),
    ("15. Conclusion", """
The Goal Tracker project successfully demonstrates a modern full-stack productivity application that is practical, understandable, and extensible. It solves a real-world planning-execution gap by combining goals, tasks, and progress analytics in one cohesive interface.

From a software engineering perspective, the application shows good foundations: modular frontend structure, clear REST APIs, schema-driven persistence, and meaningful user feedback. With incremental enhancements in security, testing, and feature depth, this project can evolve from a strong portfolio artifact into a production-ready personal productivity product.
"""),
]

appendix_intro = """
The following appendix includes selected source code to improve technical understanding of the project implementation. These listings are useful for viva, documentation review, onboarding, and maintenance handover.
""".strip()

# Build markdown
md_parts = []
md_parts.append(f"# Goal Tracker Application - Comprehensive Project Report\n")
md_parts.append(f"**Date:** {date.today().isoformat()}  ")
md_parts.append("**Prepared For:** Academic / Professional Project Submission  ")
md_parts.append("**Prepared By:** Project Team\n")
md_parts.append("## Table of Contents")
for title, _ in sections:
    md_parts.append(f"- {title}")
md_parts.append("- Appendix A. Repository Structure")
md_parts.append("- Appendix B. Source Code Listings")
md_parts.append("\n---\n")

for title, body in sections:
    md_parts.append(f"## {title}\n")
    md_parts.append(textwrap.dedent(body).strip() + "\n")

md_parts.append("## Appendix A. Repository Structure\n")
md_parts.append("```text\n" + file_tree() + "\n```\n")
md_parts.append("## Appendix B. Source Code Listings\n")
md_parts.append(appendix_intro + "\n")

for label, rel_path in project_files.items():
    code = read(rel_path)
    lang = "json" if rel_path.endswith(".json") else "javascript"
    if rel_path.endswith(".md"):
        lang = "markdown"
    md_parts.append(f"### {label} (`{rel_path}`)\n")
    md_parts.append(f"```{lang}\n{code}\n```\n")

markdown = "\n".join(md_parts)
md_path = DOCS / "Goal_Tracker_Project_Report.md"
md_path.write_text(markdown, encoding="utf-8")

# Build minimalist DOCX

def para(text: str, style: str | None = None) -> str:
    escaped = html.escape(text)
    ppr = f"<w:pPr><w:pStyle w:val=\"{style}\"/></w:pPr>" if style else ""
    return f"<w:p>{ppr}<w:r><w:t xml:space=\"preserve\">{escaped}</w:t></w:r></w:p>"

paragraphs = []
paragraphs.append(para("Goal Tracker Application - Comprehensive Project Report", "Title"))
paragraphs.append(para(f"Date: {date.today().isoformat()}"))
paragraphs.append(para("Prepared For: Academic / Professional Project Submission"))
paragraphs.append(para("Prepared By: Project Team"))
paragraphs.append(para(""))
paragraphs.append(para("Table of Contents", "Heading1"))
for title, _ in sections:
    paragraphs.append(para(title))
paragraphs.append(para("Appendix A. Repository Structure"))
paragraphs.append(para("Appendix B. Source Code Listings"))

for title, body in sections:
    paragraphs.append(para(title, "Heading1"))
    for line in textwrap.dedent(body).strip().splitlines():
        paragraphs.append(para(line))

paragraphs.append(para("Appendix A. Repository Structure", "Heading1"))
for line in file_tree().splitlines():
    paragraphs.append(para(line))

paragraphs.append(para("Appendix B. Source Code Listings", "Heading1"))
paragraphs.append(para(appendix_intro))
for label, rel_path in project_files.items():
    paragraphs.append(para(f"{label} ({rel_path})", "Heading2"))
    for line in read(rel_path).splitlines():
        paragraphs.append(para(line))

xml_doc = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    {''.join(paragraphs)}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>
'''

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'''

doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>
'''

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="44"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
</w:styles>
'''

docx_path = DOCS / "Goal_Tracker_Project_Report.docx"
with zipfile.ZipFile(docx_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("[Content_Types].xml", content_types)
    zf.writestr("_rels/.rels", rels)
    zf.writestr("word/document.xml", xml_doc)
    zf.writestr("word/_rels/document.xml.rels", doc_rels)
    zf.writestr("word/styles.xml", styles)

print(f"Created {md_path}")
print(f"Created {docx_path}")
