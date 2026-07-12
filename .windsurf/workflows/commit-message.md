---
description: Generate a structured GitHub commit message for recent changes
---

1. Check recent git changes to understand what was modified:
```
git diff HEAD --stat
git log --oneline -5
```

2. Based on the changed files, generate a commit message in this format:

```
<type>: <short summary under 72 chars>

Frontend:
- <change 1>
- <change 2>

Backend:
- <change 1>
- <change 2>

Tests:
- <what was tested, assertion count, pass count>
```

Where `<type>` is one of: feat, fix, chore, refactor, test, docs

3. Output the commit message ready to copy-paste. Keep bullet points concise (1 line each).
