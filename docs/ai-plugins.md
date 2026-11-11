# AI plugins

DoppelPod vendors two Anthropic Claude Code plugins so coding agents share one frontend-design skill and one pull-request review command. This is docs and agent config only. No application runtime code, environment variables, or hooks were added.

## Pinned source

Checked against GitHub on 2026-11-11.

| | |
| --- | --- |
| Canonical repository | https://github.com/anthropics/claude-plugins-official |
| Tree copied | [`43fd1f9db0941b2b83cb62268e35970d4a67c202`](https://github.com/anthropics/claude-plugins-official/commit/43fd1f9db0941b2b83cb62268e35970d4a67c202) (main, 2026-11-10T22:01:16Z) |
| Last commit that changed these plugins | [`f8c5e7a1dcb71b10cb74586224b5401f3de5db28`](https://github.com/anthropics/claude-plugins-official/commit/f8c5e7a1dcb71b10cb74586224b5401f3de5db28) (2026-10-27). The two plugin directories are identical between that commit and the tree above. |
| License | Apache License 2.0. Each plugin's `LICENSE` is vendored with it. The frontend-design skill also has `LICENSE.txt`. |
| frontend-design | version **1.1.1** |
| code-review | version **1.0.1** (`plugin.json`). The plugin README footer still says 1.0.0. |

`anthropics/claude-code` no longer contains these plugins. At [`e379c8eca0af5b02a49bf8e784aeefdd1308de6f`](https://github.com/anthropics/claude-code/commit/e379c8eca0af5b02a49bf8e784aeefdd1308de6f) (2026-11-11), [`plugins/README.md`](https://github.com/anthropics/claude-code/blob/e379c8eca0af5b02a49bf8e784aeefdd1308de6f/plugins/README.md) says Anthropic develops them in `claude-plugins-official`.

`anthropics/skills` still has the frontend-design skill. `skills/frontend-design/SKILL.md` at [`2c5958ecac7cee2b583967a2c4981d0f4a75c579`](https://github.com/anthropics/skills/commit/2c5958ecac7cee2b583967a2c4981d0f4a75c579) (2026-11-06) is byte-identical to the copy vendored here (`sha256 d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3`). That repo has no `code-review` plugin. This repo vendors the marketplace copies so the skill and the review command come from one pin.

`anthropics/claude-plugins-public` is the same GitHub repository as `anthropics/claude-plugins-official`. Upstream marketplace homepage URLs still use the old name.

Checksums for every vendored upstream file are in [`.claude/plugins/doppelpod-anthropic/SOURCE.md`](../.claude/plugins/doppelpod-anthropic/SOURCE.md).

## What each one does

### frontend-design

A skill, not a slash command. Before writing or reshaping UI, the agent writes a short plan for color, type, layout, and principles, grounded in this product, checks that plan against generic AI-looking defaults, and only then writes code.

The upstream README credits Prithvi Rajasekaran and Alexander Bricken.

### code-review

The `/code-review` command. It reviews a pull request with parallel agents, drops findings that fail a later validation pass, and prints a summary. It posts to GitHub only when `--comment` is passed.

Follow `commands/code-review.md`, not the plugin README. At this pin the README still describes four agents (two guideline audits, one bug scan, one git-blame pass) and an 80-point cutoff. The command uses two guideline agents and two bug agents, then separate validators. It does not mention git blame or a numeric 80 threshold.

## Where it is installed

| Path | What it is |
| --- | --- |
| `.claude/settings.json` | Registers marketplace `doppelpod-anthropic` and enables both plugins. `autoUpdate` is false, so Claude Code does not refresh this catalog from the network. |
| `.claude/plugins/doppelpod-anthropic/` | The marketplace. Only these two plugins, copied from the commit above. |
| `.cursor/skills/frontend-design/` | The same `SKILL.md` and `LICENSE.txt`, so Cursor agents load the skill. |
| `.cursor/skills/code-review/SKILL.md` | Cursor entry point. It sends the agent to the vendored command. |
| `.cursor/rules/frontend-design.mdc` | When `src/**/*.tsx` or `src/**/*.css` is in context, tells the agent to read the skill before editing UI. |
| `CLAUDE.md` | Short pointer for sessions that do not load plugins. |

`.gitignore` ignores `.claude/*` except `memory/`, `settings.json`, and `plugins/`.

`.claude/skills/` is intentionally unused. The frontend-design skill already loads from the enabled plugin. A second copy under `.claude/skills/` would register the same skill twice. Cursor does not load Claude Code plugins, which is why the skill is also copied under `.cursor/skills/`.

Claude Code cloud sessions do not load plugins turned on by a repository `.claude/settings.json`. They still read `CLAUDE.md` and the markdown in this repo. Local Claude Code loads the plugins from the committed directory marketplace after the folder is trusted. A relative-path marketplace does not need a separate download step. See [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org) and [Install and manage plugins](https://code.claude.com/docs/en/plugins/install).

## Install and update

Pulling the repo is the install for the vendored copies. After the project folder is trusted, `.claude/settings.json` enables both plugins. You do not need a marketplace download for that copy.

To register the local marketplace by hand:

```text
/plugin marketplace add ./.claude/plugins/doppelpod-anthropic
/plugin install frontend-design@doppelpod-anthropic
/plugin install code-review@doppelpod-anthropic
```

Shell equivalents, from the repo root:

```text
claude plugin marketplace add ./.claude/plugins/doppelpod-anthropic
claude plugin install frontend-design@doppelpod-anthropic --scope project
claude plugin install code-review@doppelpod-anthropic --scope project
```

Official catalog, for a machine that should track Anthropic's marketplace directly. The files committed in this repo stay the source of truth. Enable the plugins from `doppelpod-anthropic` here. Also enabling `frontend-design@claude-plugins-official` registers the skill a second time.

Claude Code documents the pin form as `owner/repo#ref`, where `ref` is a branch or tag ([install docs](https://code.claude.com/docs/en/plugins/install)). The commands below pass the full commit SHA in that position. Git can check out that SHA on GitHub. If a Claude Code build rejects a raw SHA and asks for a branch or tag, skip the remote install and use the vendored marketplace above.

```text
/plugin marketplace add anthropics/claude-plugins-official#43fd1f9db0941b2b83cb62268e35970d4a67c202
/plugin install frontend-design@claude-plugins-official
/plugin install code-review@claude-plugins-official
```

```text
claude plugin marketplace add anthropics/claude-plugins-official#43fd1f9db0941b2b83cb62268e35970d4a67c202
claude plugin install frontend-design@claude-plugins-official --scope project
claude plugin install code-review@claude-plugins-official --scope project
```

Updating the files in git is a reviewed commit. `autoUpdate` is false, and `/plugin marketplace update` does not move this pin.

1. Clone `https://github.com/anthropics/claude-plugins-official.git` and check out the commit you intend to pin.
2. Read both plugin trees before copying. Stop if you find a `hooks/` directory, a `hooks` key, an MCP server, or anything that runs a shell, calls the network, or reads environment variables, unless that behavior is explicitly accepted.
3. Replace `.claude/plugins/doppelpod-anthropic/plugins/frontend-design` and `plugins/code-review` with those files, including their license files. Do not copy a `hooks/` directory.
4. Copy `skills/frontend-design/SKILL.md` and `LICENSE.txt` onto `.cursor/skills/frontend-design/`.
5. Update the commit, versions, and checksums in this file and in `SOURCE.md`.

Commands that refresh a Claude Code install of the official marketplace, and do not change the vendored files:

```text
/plugin marketplace update claude-plugins-official
claude plugin update frontend-design@claude-plugins-official
claude plugin update code-review@claude-plugins-official
```

`claude plugin marketplace update` with no name refreshes marketplace listings and leaves installed plugins at their current versions. `claude plugin update <plugin>@<marketplace>` updates one installed plugin.

## How to run code review

The plugin expects a GitHub repository and the GitHub CLI (`gh`), already authenticated. The command does not read `.env` files. `gh` uses its existing login.

In Claude Code, check out the pull request branch and run:

```text
/code-review
```

That prints the review in the session and does not comment on the pull request.

```text
/code-review --comment
```

That posts. With no findings, the command posts a short summary with `gh pr comment`. With findings, it posts inline comments with `mcp__github_inline_comment__create_inline_comment`. Cursor does not have that MCP tool. The Cursor skill tells the agent to skip a missing tool, and still not to post unless `--comment` or an explicit request to comment was given.

In Cursor, ask for a code review of the pull request, or name `/code-review`. The agent follows `.cursor/skills/code-review/SKILL.md`, which defers to the vendored command.

## Security review

Every file under both plugin directories was read at the pinned commit before it was copied:

- `frontend-design/.claude-plugin/plugin.json`
- `frontend-design/README.md`
- `frontend-design/LICENSE`
- `frontend-design/skills/frontend-design/SKILL.md`
- `frontend-design/skills/frontend-design/LICENSE.txt`
- `code-review/.claude-plugin/plugin.json`
- `code-review/README.md`
- `code-review/LICENSE`
- `code-review/commands/code-review.md`

There is no `hooks/` directory, no `hooks` key in either `plugin.json`, no `.mcp.json`, and no scripts or binaries. This repo does not add hooks.

**frontend-design.** Markdown only. It does not run shell commands, call the network, or read environment variables or secrets. It tells the agent to take a screenshot when the environment already has a screenshot tool, and to use preferences already in agent memory. Those are instructions to the model, not executable hooks.

**code-review.** Not a hook. It runs when `/code-review` is invoked. Two things to know:

1. The command sets `disable-model-invocation: false`. Claude Code may start it without someone typing the slash command, when the model decides a review is appropriate. It does not run on session start. Nothing in this repo adds a hook that would run it automatically.
2. While the command is active, `allowed-tools` grants only:
   - `Bash(gh issue view:*)`
   - `Bash(gh search:*)`
   - `Bash(gh issue list:*)`
   - `Bash(gh pr comment:*)`
   - `Bash(gh pr diff:*)`
   - `Bash(gh pr view:*)`
   - `Bash(gh pr list:*)`
   - `mcp__github_inline_comment__create_inline_comment`

   Those `gh` calls go over the network as whichever account `gh` is already logged into. They can read pull requests, issues, and search results. `gh pr comment` and the inline-comment tool can write to GitHub. The command text says to write a comment only when `--comment` was passed. The tool grant does not enforce that on its own. A model that ignores the instruction could still comment. Pass `--comment` only when comments should be posted.

The command does not grant arbitrary shell, and it does not read environment variables or secret files. The README's `brew install gh` and `gh auth login` lines are troubleshooting text. The command does not run them.

The vendored command and skill files are unchanged from the pinned commit. `.cursor/skills/code-review/SKILL.md`, `.cursor/rules/frontend-design.mdc`, `CLAUDE.md`, `.claude/settings.json`, and the local `marketplace.json` were written for this repo. `marketplace.json` lists only these two plugins, so enabling the local marketplace does not pull the rest of Anthropic's catalog.
