---
"@funkai/agents": minor
---

Add `toTextStreamResponse()` and `toUIMessageStreamResponse()` methods to `StreamResult`, enabling direct HTTP response conversion for API frameworks like Hono, Express, and Bun. Both methods delegate to the underlying Vercel AI SDK `streamText` result. Flow agents throw a descriptive error since they lack a single model stream.
