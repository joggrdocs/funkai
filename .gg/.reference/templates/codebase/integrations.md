<!--
  integrations.md — External integrations and services reference

  Rules:
  - Agents READ this file before working with external services
  - Agents may ONLY propose updates when there is a significant integration change
  - Updates REQUIRE human approval via AskUserQuestion before writing
  - NEVER include secrets, API keys, or credentials in this file
-->

# Integrations

> Last updated: {{date}}

## APIs

| Service      | Purpose         | Client Location     |
| ------------ | --------------- | ------------------- |
| {{api_name}} | {{api_purpose}} | {{api_client_path}} |

## Databases

| Database    | Purpose        | Connection Location    |
| ----------- | -------------- | ---------------------- |
| {{db_name}} | {{db_purpose}} | {{db_connection_path}} |

## Authentication

{{auth_setup}}

## Monitoring & Observability

{{monitoring_setup}}

## Webhooks

| Webhook          | Purpose             | Handler Location         |
| ---------------- | ------------------- | ------------------------ |
| {{webhook_name}} | {{webhook_purpose}} | {{webhook_handler_path}} |

## Environment Configuration

| Variable    | Purpose         | Required         |
| ----------- | --------------- | ---------------- |
| {{env_var}} | {{env_purpose}} | {{env_required}} |

**Note:** Never include actual values for environment variables. Document their purpose and whether they are required.
