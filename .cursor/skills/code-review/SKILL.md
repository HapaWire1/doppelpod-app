---
name: code-review
description: Review a pull request with Anthropic's official code-review command (parallel reviewers, then a validation pass). Use only when the user asks for a PR review, /code-review, or review comments. Do not start a review because files changed.
---

# Code review

Cursor entry point for Anthropic's official `code-review` plugin, vendored unchanged in this repo. Read that command and follow it, including its tool limits and the `--comment` gate:

`.claude/plugins/doppelpod-anthropic/plugins/code-review/commands/code-review.md`

License: Apache-2.0, `.claude/plugins/doppelpod-anthropic/plugins/code-review/LICENSE`. Source and pin: `.claude/plugins/doppelpod-anthropic/SOURCE.md`.

Rules for this repo:

- Run only when someone asks for a review. This is not a hook and must not run because files changed.
- Default output is a review in the session. Do not post GitHub comments, reviews, or inline comments unless the user passed `--comment` or explicitly asked to comment on the pull request.
- When GitHub access is required, stay within the `gh` commands the official command allows: `gh pr view`, `gh pr diff`, `gh pr list`, `gh pr comment`, `gh issue view`, `gh issue list`, and `gh search`. Do not expand into other shell commands, and do not read environment variables or secrets.
- Cursor does not provide `mcp__github_inline_comment__create_inline_comment`. If `--comment` was requested and that tool is missing, say so and post with `gh pr comment` only when the official steps say to comment. Do not invent extra comments.
