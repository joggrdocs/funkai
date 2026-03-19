import type { FunkaiConfig } from "@funkai/config";
import type { ConfigType, Context } from "@kidd-cli/core";

import { configSchema } from "@funkai/config";

export { configSchema };

/**
 * Extract the typed funkai config from a command context.
 *
 * kidd-cli's `Merge<CliConfig, TConfig>` erases augmented keys when
 * `TConfig` defaults to `Record<string, unknown>`, so we cast here.
 *
 * @param ctx - The CLI context.
 * @returns The typed funkai configuration.
 */
export function getConfig(ctx: Pick<Context, "config">): Readonly<FunkaiConfig> {
  return ctx.config as unknown as Readonly<FunkaiConfig>;
}

declare module "@kidd-cli/core" {
  interface CliConfig extends ConfigType<typeof configSchema> {}
}
