# Git Discipline — XIIGen

## Branch Rules

| Branch | Rule |
|--------|------|
| `main` | Never commit directly. Never force push. Read-only for Claude Code. |
| `claude/hardcore-cohen` (or any `claude/*`) | Session work happens here |
| Feature branches | Created from session branch, never from main |

### Branch Name Validation — MANDATORY Before Any Push

**Always use EXACTLY the branch name the user stated. Never infer or substitute a similar name.**

```
User says "push to X" → push to X, not to Y even if Y looks similar

Examples of the violation:
  User: "push to Skills_Creation_Claude"
  Wrong: git push origin Skills_Creation   ← similar name, WRONG
  Right: git push origin Skills_Creation_Claude

If no branch name given → ask before pushing: "Which branch should I push to?"
If a similar branch already exists → ask: "You said [X]. I see [Y] also exists. Confirm: push to [X]?"
```

### Before Any Commit
```bash
git branch --show-current   # must NOT be main
git status                  # review ALL changed files
git diff --staged           # review exactly what you're committing
```

### Commit Format
```
P[N]: [skill-name or deliverable] — [one-line description]

Examples:
P1: agent-constitution — governance skill files (5 SKILL.md + rules)
P1: dev-safety — session gate rules
P11: af4-rag-context — add SkillBlock selector (APPROVED DR-241)
```

### Never Commit These Files
```gitignore
# Check before git add:
.env
.env.*
*.pem
*.key
*.cert
server/dist/
client/dist/
node_modules/
*.log
```

```bash
# Verify nothing sensitive is staged:
git diff --staged --name-only | grep -E "\.env|\.pem|\.key|node_modules"
# Expected: empty output
```

## Stash Protocol

If you need to switch context mid-session without committing incomplete work:
```bash
git stash push -m "P[N] WIP: [description]"
# ... do other work ...
git stash pop
```

Never leave stashes older than the current session. They create confusion about what's committed.

## Conflict Resolution

If a merge conflict occurs:
1. Read BOTH sides of the conflict
2. Do NOT blindly keep "ours" — the incoming change might be load-bearing
3. If unsure which side is correct: escalate to Luba
4. Never resolve conflicts by removing tests or skill files

## What Claude Code Will NEVER Do

- `git push --force` to any branch
- `git reset --hard` to discard committed work
- `git checkout .` to discard working changes (unless explicitly instructed)
- `git commit --amend` on a commit that has been pushed
- Commit directly to `main`
