---
name: write-skill
description: Conventions for authoring SKILL.md files. Load before creating or reviewing any skill.
---

# Skill Writing

## Purpose

This skill defines how skills are structured, written, and maintained so they are consistent, concise, and effective.

## Frontmatter

Two required fields:

- **`name`**: Must match the directory name exactly. Lowercase letters, numbers, hyphens only. Max 64 chars.
- **`description`**: One concise sentence. Describes what the skill does. Max 1024 chars.

Optional fields:

- **`last_verified`**: ISO date (`'2025-03-04'`). Used on domain-specific skills that reference concrete file paths, entity names, or API shapes that may drift over time.

### Description Rules

The description is the primary trigger mechanism — the model uses it to choose from all available skills.

- Write in third person: "TypeORM migration workflow for..." — not "I help with" or "Use this to"
- Be specific: include the domain and scope
- Keep it to one sentence — no multi-sentence trigger lists

Good examples from existing skills:

- `Testing conventions with a generic baseline plus monorepo-specific addendum.`
- `Code review checklist and conventions. Load before reviewing a pull request.`
- `Conventions for creating and evolving apps in Chirp-style Yarn/Turbo monorepos.`

Bad: `Helps with documents` / `Processes data` / generic descriptions without scope.

### Naming Conventions

Prefer descriptive compound names: `review-code`, `review-pull-requests`, `database-typeorm-migrations`, `develop-monorepo-app`.

Avoid: vague names (`helper`, `utils`), overly generic (`documents`, `data`), single words when a compound is clearer.

## Title and Section Ordering

### H1 Title

Use `# <Descriptive Name>` as the first line after frontmatter. Patterns from existing skills:

- `# TypeScript Skill`
- `# Code Review Conventions`
- `# Monorepo App Writing`
- `# TypeORM Migrations (Monorepo)`

### Section Order

Skills follow this general structure (not every section is required):

1. **Purpose / Applicability** — What the skill does, when it applies
2. **Core Rules / Principles** — The non-negotiable constraints
3. **Detailed Sections** — Domain-specific guidance, patterns, examples, workflows
4. **Anti-Patterns** — What to avoid (flat bullet list)
5. **Rules / Checklist** — Final summary of do/don't rules

Not every skill needs every section. Small skills (like `review-pull-requests` at 146 lines) skip straight from conventions to rules. Large skills (like `develop-terraform` at 727 lines) have many detailed sections. Scale the structure to the content.

## Applicability Gate

Skills that only apply in specific contexts must start with an applicability check. This pattern is used by monorepo-specific skills and domain-specific skills:

```markdown
## Applicability

Use this skill only when all are true:

- the target repository is a Turbo/workspace monorepo
- the repository has an `apps/` and/or `packages/` folder at root
- work is being done inside that monorepo repository

If these signals are missing, do not apply this skill.
```

Skills that are universally applicable (like `language-typescript`, `quality-testing`, `review-code`) skip the gate and start with Purpose or Core Rules instead.

### Monorepo Addendum Pattern

Some universally applicable skills have monorepo-specific content that only applies conditionally. These use an addendum section near the end:

```markdown
## Monorepo-Only Addendum (Turbo/workspaces + `apps/`/`packages/`)

Apply this section only when all are true:

- the target repository is a Turbo/workspace monorepo
- the repository has an `apps/` and/or `packages/` folder at root
- work targets code inside that monorepo repository
```

This pattern is used by `language-typescript`, `quality-testing`, and `maintenance-refactor-cleanup`.

## Writing Principles

### Be Concise — Context Window Is Shared

Only add context the model doesn't already have. Challenge each piece of information:

- "Does the model really need this explanation?"
- "Can I assume the model knows this?"
- "Does this paragraph justify its token cost?"

Don't explain what well-known libraries, frameworks, or concepts are. Don't restate what tool descriptions already contain. Focus on project-specific conventions and decisions.

### Concrete Over Abstract

Show actual code, actual templates, actual patterns from the codebase. Input/output examples are more effective than descriptions.

Good — actual pattern with real names:

```typescript
@Controller('feature')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class FeatureController { ... }
```

Bad — abstract description: "Controllers should use appropriate guards and decorators."

### Match Constraint Level to Task Fragility

- **High freedom** (text instructions): Multiple valid approaches, context-dependent. Example: code review tone guidelines.
- **Medium freedom** (templates with variation): Preferred pattern exists but variation acceptable. Example: PR description templates by size.
- **Low freedom** (exact sequences): Fragile operations, consistency critical. Example: TypeORM migration workflow steps.

### Source of Truth Hierarchy

When a skill might conflict with other sources, state the priority explicitly:

```markdown
## Source of Truth Hierarchy

When rules conflict, apply in this order:

1. Repository lint + compiler rules
2. Existing local pattern in the nearest module/package
3. This skill's defaults
```

### Tool References

Reference tools by their bare name: `jira_create_issue`, `codebase_find_definition`, `github_get_pull_request`. Do not document tool parameters — the model already has tool descriptions injected automatically.

## Size Guidelines

Keep SKILL.md under 500 lines for focused skills. Domain-heavy skills (like `develop-terraform` at 727 lines or `maintenance-opencode-plugins-development` at 746 lines) can exceed this when the domain genuinely requires it, but consider whether content could be split.

The range across existing skills:

| Size       | Lines   | Examples                                                          |
| ---------- | ------- | ----------------------------------------------------------------- |
| Small      | < 150   | `maintenance-refactor-cleanup` (99), `review-pull-requests` (146) |
| Medium     | 150–300 | `project-jira-tickets` (191), `review-code` (192)                 |
| Large      | 300+    | `quality-testing` (311), `language-typescript` (303)              |
| Very large | 500+    | `develop-terraform` (727)                                         |

## Anti-Patterns

- `name` field doesn't match directory name
- Multi-sentence descriptions with trigger phrase padding
- Explaining what well-known tools/frameworks are
- Re-documenting tool parameters the model already has
- Abstract advice without concrete examples from the codebase
- Deeply nested file references (SKILL.md -> advanced.md -> details.md)
- Time-sensitive content with date-based conditionals — use "current" / "legacy" sections instead
- Inconsistent terminology — pick one term and stick with it throughout
- Missing applicability gate on context-specific skills
- Horizontal rules (`---`) between sections — use headings alone for structure
- Magic numbers without explanation

## Rules

- `name` must match directory name exactly
- Description is one concise sentence in third person
- Use `last_verified` on domain-specific skills that reference concrete paths or APIs
- Start with Purpose or Applicability, end with Anti-Patterns or Rules
- Use the Monorepo Addendum pattern for conditional monorepo content
- Show concrete patterns from the actual codebase, not abstract advice
- Reference tools by bare name — don't re-document their parameters
- Scale structure to content — don't pad small skills with empty sections
- Use headings for structure — no horizontal rules (`---`) between sections
- Keep terminology consistent within and across related skills
