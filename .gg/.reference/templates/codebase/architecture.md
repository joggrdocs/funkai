<!--
  architecture.md — Architecture and structure reference

  Rules:
  - Agents READ this file before code exploration or modification
  - Agents may ONLY propose updates when there is a significant architectural change
  - Updates REQUIRE human approval via AskUserQuestion before writing
  - New files within existing modules do NOT warrant an update
-->

# Architecture

> Last updated: {{date}}

## Overview

{{architecture_overview}}

## Directory Layout

```
{{directory_layout}}
```

## Entry Points

| Entry Point    | Path           | Purpose           |
| -------------- | -------------- | ----------------- |
| {{entry_name}} | {{entry_path}} | {{entry_purpose}} |

<!-- Adapt section headers to project type: Apps/Packages (JS/TS), Crates (Rust), Modules (Go/Python) -->

## Components

| Name               | Path               | Purpose               |
| ------------------ | ------------------ | --------------------- |
| {{component_name}} | {{component_path}} | {{component_purpose}} |

## Data Flow

{{data_flow}}

## Patterns

{{architectural_patterns}}

## Adding Code

{{guidance_for_adding_code}}
