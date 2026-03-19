---
"@funkai/agents": minor
---

Add mapper function overload to `evolve()` for both `Agent` and `FlowAgent`. The mapper receives the stored config and returns partial overrides, enabling provider propagation patterns like rewiring model IDs to a different provider at deploy time.
