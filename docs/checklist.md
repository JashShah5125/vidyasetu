Before implementing this feature, DO NOT start coding immediately.

First, inspect the existing project thoroughly and identify how similar functionality is already implemented in the backend.

Feature I am working on
[DESCRIBE THE FEATURE HERE]

Your job
Act as a senior engineer working within the existing architecture of this project.

Your first priority is to reuse and follow existing backend patterns rather than introducing new patterns, duplicate logic, services, utilities, models, or API structures.

Step 1 — Find similar existing modules
Search the entire codebase and identify the modules/features that are most similar to the feature I am about to build.

For each relevant module, inspect:

Routes / API endpoints
Controllers / handlers
Services
Business logic
Models / entities / schemas
Repositories / database access
DTOs / request types
Response types
Validation
Authentication
Authorization / permissions
Error handling
Pagination / filtering / sorting
Transactions
Events / queues / background jobs
File/storage handling
Tests
Do not assume something doesn't exist. Search the codebase before proposing a new implementation.

Step 2 — Identify reusable code
Create a list of everything from the existing backend that can be reused for this feature.

Look specifically for:

Existing services
Existing functions
Existing utilities/helpers
Existing models/entities
Existing database tables/collections
Existing relationships
Existing middleware
Existing validators
Existing permission checks
Existing API patterns
Existing response/error formats
Existing shared components
Existing hooks/events
Existing test patterns
For every reusable piece, give me:

File path
Function/class/component name
What it currently does
How it can be reused for this feature
Step 3 — Detect duplication risks
Tell me if the proposed feature would duplicate anything already present.

Explicitly flag:

Duplicate business logic
Duplicate database logic
Duplicate validation
Duplicate authorization
Duplicate API patterns
Duplicate utilities
Duplicate models
Duplicate services
Duplicate error handling
Duplicate frontend/backend logic
If existing code should be extended instead of creating new code, explain why.

Step 4 — Understand the existing architecture
Summarize the architecture/pattern currently used by the closest existing modules.

For example:

Feature
→ Route
→ Controller
→ Service
→ Repository
→ Database

Use the ACTUAL architecture found in this project, not a generic architecture.

Also identify:

Naming conventions
Folder structure
File organization
Dependency patterns
Error-handling conventions
Validation conventions
API response conventions
Database conventions
Testing conventions
Step 5 — Compare the new feature against existing modules
Create a comparison like:

Concern	Existing Module	New Feature	Reuse / New
Route	...	...	...
Controller	...	...	...
Service	...	...	...
Model	...	...	...
Validation	...	...	...
Authorization	...	...	...
Database	...	...	...
Errors	...	...	...
Tests	...	...	...

Be specific and reference actual files.

Step 6 — Database check
Before suggesting any new table/model/schema:

Search for existing tables/models/entities that could represent the required data.
Check existing relationships.
Check existing migrations.
Check existing indexes and constraints.
Determine whether the new feature can use or extend existing structures.
Only recommend a new database structure if an existing one genuinely cannot support the requirement.
Explain why a new structure is necessary if you recommend one.

Step 7 — API check
Before proposing new endpoints:

Search for similar endpoints.
Check route naming conventions.
Check HTTP methods used.
Check request/response formats.
Check authentication middleware.
Check authorization middleware.
Check validation.
Check error/status-code conventions.
Check pagination/filtering patterns.
Reuse existing API conventions.

Step 8 — Give me an implementation plan BEFORE coding
After inspecting the project, give me:

Existing modules to reference
[List the most relevant modules and file paths]

Code I can reuse
[List specific reusable files/functions/classes]

Code that should be extended
[List existing code that should be modified rather than duplicated]

New code actually required
[List only what genuinely needs to be created]

Database changes
[Explain whether database changes are required]

API changes
[List required endpoints]

Risks / edge cases
[List important edge cases]

Files likely to change
[List exact file paths]

Recommended implementation order
...
...
...
...
Step 9 — Stop before implementation
IMPORTANT:

Do NOT implement the feature yet.

Do NOT create files.

Do NOT modify existing files.

Do NOT write code unless I explicitly ask you to proceed.

First give me the audit and implementation plan so I can review it.

Core rule
Follow this priority:

Reuse existing code
Extend existing code
Refactor existing shared logic if necessary
Create new code only when required
Never introduce a new pattern when an existing project pattern already solves the problem.

If you cannot find an existing pattern, explicitly say:

"NO EXISTING PATTERN FOUND"

and explain what you searched before proposing a new approach.