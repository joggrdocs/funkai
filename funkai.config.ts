import { defineConfig } from "@funkai/config";

export default defineConfig({
  prompts: {
    includes: ["examples/prompts-basic/src/**/*.prompt"],
    out: "/tmp/funkai-gen-test",
  },
});
