# Vendored Anthropic plugins

These plugin directories are copied unchanged from Anthropic. DoppelPod did not modify `plugin.json`, `SKILL.md`, `commands/code-review.md`, the READMEs, or the license files.

| | |
| --- | --- |
| Source | https://github.com/anthropics/claude-plugins-official |
| Commit | `43fd1f9db0941b2b83cb62268e35970d4a67c202` |
| Commit date | 2026-11-10T22:01:16Z |
| Last commit that touched these paths | `f8c5e7a1dcb71b10cb74586224b5401f3de5db28` (2026-10-27). The plugin trees are identical at both commits. |
| License | Apache License 2.0 (`LICENSE` in each plugin, and `LICENSE.txt` beside the frontend-design skill) |
| Versions | frontend-design 1.1.1, code-review 1.0.1 |

`anthropics/claude-code` `plugins/` at `e379c8eca0af5b02a49bf8e784aeefdd1308de6f` only documents that these plugins moved to the repo above. `anthropics/skills` `skills/frontend-design/SKILL.md` at `2c5958ecac7cee2b583967a2c4981d0f4a75c579` matches the vendored skill byte for byte. `code-review` is not in that skills repo.

Install, update, and the security review: `docs/ai-plugins.md`.

## Checksums (sha256)

```
d45be5b9f5e729dd8dd545d97b46800f50c2791cb053c480495d1195ce2052be  plugins/frontend-design/.claude-plugin/plugin.json
cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30  plugins/frontend-design/LICENSE
5351137ecb2c5adfcdbadcdbbeda1eab16409bae98eb53f62f945514552d6706  plugins/frontend-design/README.md
0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594  plugins/frontend-design/skills/frontend-design/LICENSE.txt
d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3  plugins/frontend-design/skills/frontend-design/SKILL.md
0c5d2784bc1ab85b14e578132c141e9e0bb52dbc041f8a9094f8564cd370ffce  plugins/code-review/.claude-plugin/plugin.json
3f02ea6eed996590348264777b2e324859a6e2c0c5f7dd298617ea21deb3b1b2  plugins/code-review/commands/code-review.md
cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30  plugins/code-review/LICENSE
8ba1b98f4537d70347ec982691a8fc8a1ee4153189877d028375fb644ddc3071  plugins/code-review/README.md
```
