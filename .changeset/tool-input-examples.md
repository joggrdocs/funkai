---
"@funkai/agents": minor
---

Add `middleware` and `toolInputExamples` fields to AgentConfig. Enable `addToolInputExamplesMiddleware` by default so `inputExamples` on tools are surfaced to the model. Set `toolInputExamples: false` to disable.
