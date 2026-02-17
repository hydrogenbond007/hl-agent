# Project Operating Rules

These rules apply to all future operations in this repository.

- Delete unused or obsolete files when your changes make them irrelevant (refactors, feature removals, etc.), and revert files only when the change is yours or explicitly requested.
- If a git operation leaves you unsure about other agents' in-flight work, stop and coordinate instead of deleting.
- Before attempting to delete a file to resolve a local type/lint failure, stop and ask the user. Other agents are often editing adjacent files; deleting their work to silence an error is never acceptable without explicit approval.
- NEVER edit `.env` or any environment variable files. Only the user may change them.
- Coordinate with other agents before removing their in-progress edits. Do not revert or delete work you did not author unless everyone agrees.
- Moving/renaming and restoring files is allowed.
- ABSOLUTELY NEVER run destructive git operations (e.g., `git reset --hard`, `rm`, `git checkout`/`git restore` to an older commit) unless the user gives an explicit, written instruction in this conversation.
- Never use `git restore` (or similar commands) to revert files you did not author. Coordinate with other agents instead so their in-progress work stays intact.
- Always double-check `git status` before any commit.
- Keep commits atomic: commit only the files you touched and list each path explicitly.
  - For tracked files run: `git commit -m "<scoped message>" -- path/to/file1 path/to/file2`
  - For brand-new files use: `git restore --staged :/ && git add "path/to/file1" "path/to/file2" && git commit -m "<scoped message>" -- path/to/file1 path/to/file2`
- Quote any git paths containing brackets or parentheses (e.g., `src/app/[candidate]/**`) when staging or committing so the shell does not treat them as globs or subshells.
- When running git rebase, avoid opening editors. Export `GIT_EDITOR=:` and `GIT_SEQUENCE_EDITOR=:` (or pass `--no-edit`) so default messages are used automatically.
- Never amend commits unless you have explicit written approval in the task thread.

