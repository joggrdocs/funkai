import { createRequire } from "node:module";

import { cli } from "@kidd-cli/core";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { readonly version: string };

await cli({
  description: "CLI for the funkai AI SDK framework",
  name: "funkai",
  version: packageJson.version,
});
