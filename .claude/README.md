# Task Planning Documentation

## Philosophy

This template follows an **architect → oneshot → iterate** workflow:

1. **Think first** - Define vision, data models, dependencies
2. **Foundation layer** - Get schemas and relationships right
3. **Let AI build** - Implementation details can be oneshotted
4. **Iterate fast** - Tweak, review, QA together

> "I spent a day and a half on the foundation layer... then I loaded it and it oneshotted it."

## Usage

### Create a New Task File

```
@templates/task.md

Use this template to create a task specification for: <your-task-description>

Focus on:
- Clear vision and goals
- Complete data models (entities, relationships, seed data)
- Dependencies (what this needs, what this provides)
- Keep implementation guidance light - let AI figure out details
```

### Fill Template with Task Description

```
@templates/task.md

Fill this template for the following task. Focus on the FOUNDATION (data models, schemas, dependencies) more than implementation details. The AI can oneshot the implementation if the foundation is solid.

Task:
<your-task-description>

Existing context:
<reference-files-or-codebase-location>
```

## Template Structure

| Section            | Purpose                              | Time Investment |
| ------------------ | ------------------------------------ | --------------- |
| `<vision>`         | What, why, and how it connects       | High            |
| `<foundation>`     | Data models, seed data, dependencies | **Highest**     |
| `<implementation>` | Core behavior, not prescriptive UI   | Medium          |
| `<constraints>`    | Guardrails, patterns to follow       | Medium          |
| `<quality_gates>`  | No gaping problems, ready to ship    | Low             |
| `<questions>`      | Clarify before starting              | Required        |
| `<context>`        | Links, references, codebase location | Low             |

## Key Principles

1. **Data models are king** - Spend most time here. Use JSON/Markdown, not CSVs.
2. **Dependencies matter** - How does this connect to everything else?
3. **Light on UI details** - Let AI oneshot implementation from solid foundation.
4. **No gaping problems** - Ship fast but avoid tech debt that requires refactoring.
5. **Ask, don't assume** - Questions section is mandatory before starting.

## Files

- `task_template.md` - Template for feature implementation tasks
- `README.md` - This file
