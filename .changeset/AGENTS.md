# @funkai/agents — Changeset Rules

All packages in this repo are **pre-1.0** and use `minor` for breaking changes and `patch` for non-breaking changes.

**Never use `major` in a changeset for `@funkai/agents` (or any `@funkai/*` package) until the team decides to release 1.0.**

## Bump Guide

| Change type              | Bump    | Example                                    |
| ------------------------ | ------- | ------------------------------------------ |
| Breaking API change      | `minor` | Renamed/removed exports, changed signatures |
| New feature (additive)   | `minor` | New exported function, new config option    |
| Bug fix                  | `patch` | Fix incorrect behavior, fix types           |
| Internal refactor        | `patch` | No public API change                        |
| Documentation only       | none    | No changeset needed                         |

## Example Changeset

```md
---
"@funkai/agents": minor
---

Rename `StepInfo` to `StepStartEvent` and flatten step hook payloads.
```
