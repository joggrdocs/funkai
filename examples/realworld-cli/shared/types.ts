// ---------------------------------------------------------------------------
// SSE event types shared between the API server and CLI client
// ---------------------------------------------------------------------------

export type AnalyzeEvent =
  | { readonly type: "step:start"; readonly stepId: string; readonly stepType: string }
  | { readonly type: "step:finish"; readonly stepId: string; readonly duration: number }
  | { readonly type: "text-delta"; readonly text: string }
  | { readonly type: "tool-call"; readonly toolName: string; readonly input: string }
  | {
      readonly type: "tool-execute";
      readonly callId: string;
      readonly toolName: string;
      readonly input: unknown;
    }
  | { readonly type: "scan-complete"; readonly files: readonly string[] }
  | { readonly type: "analysis"; readonly filePath: string; readonly summary: string }
  | {
      readonly type: "done";
      readonly scannedFiles: readonly string[];
      readonly totalIssues: number;
    }
  | { readonly type: "error"; readonly message: string };

// ---------------------------------------------------------------------------
// Tool result payload — CLI posts this back to the API
// ---------------------------------------------------------------------------

export interface ToolResultPayload {
  readonly callId: string;
  readonly output: unknown;
  readonly error?: string;
}
