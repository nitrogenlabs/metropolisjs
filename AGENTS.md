# AGENTS.md

## Core Rule
- Treat shared data contracts as strict and canonical.
- Do not add legacy aliases, compatibility shims, fallback field names, or dual-write behavior.

## Required Patterns
- When a shared contract changes, update MetropolisJS to the canonical field names and update callers instead of supporting both shapes.
- Keep API payloads aligned with the current Reaktor schema.

## Prohibited Patterns
- No temporary backward-compatibility layers for field renames.
- No adapters that emit both old and new field names for the same value.
