/**
 * Generate a deterministic changeset ID for nightly model updates.
 *
 * Uses the current date (YYYYMMDD) to produce a stable, non-colliding
 * filename for the changeset markdown file.
 */
const now = new Date();
const id = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-models-update`;
console.log(id);
