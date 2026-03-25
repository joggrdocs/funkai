# privateField

Create a type-safe accessor for a Symbol-keyed private field on plain objects.

Private fields are invisible to `Object.keys()`, `JSON.stringify()`, `for...in`, and object spread. The Symbol is the sole access key.

## API

```ts
import { privateField } from "@funkai/utils";
import type { PrivateField } from "@funkai/utils";
```

### `privateField<T>(description: string): PrivateField<T>`

Creates a frozen accessor for a private Symbol-keyed property.

Uses `Symbol.for(description)` internally — the same description string produces the same Symbol across package boundaries.

**Parameters:**

| Name          | Type     | Description                                                   |
| ------------- | -------- | ------------------------------------------------------------- |
| `description` | `string` | A namespaced key for the Symbol (e.g. `"funkai:agent-chain"`) |

**Returns:** A frozen `PrivateField<T>` accessor.

### `PrivateField<T>`

| Method   | Signature                                   | Description                                   |
| -------- | ------------------------------------------- | --------------------------------------------- |
| `symbol` | `readonly symbol`                           | The underlying Symbol                         |
| `get`    | `(obj: object) => T \| undefined`           | Read the field. Returns `undefined` if absent |
| `get`    | `(obj: object, defaultValue: T) => T`       | Read the field with a fallback                |
| `set`    | `<O extends object>(obj: O, value: T) => O` | Attach the field. Returns the same object     |
| `has`    | `(obj: object) => boolean`                  | Check if the field is present                 |
| `remove` | `(obj: object) => boolean`                  | Delete the field. Returns `true` if removed   |

## Usage

```ts
const _nameField = privateField<string>("my-lib:name");

const obj = { visible: true };
_nameField.set(obj, "hidden-value");

_nameField.get(obj);            // => "hidden-value"
_nameField.get({}, "fallback"); // => "fallback"
_nameField.has(obj);            // => true

Object.keys(obj);    // => ["visible"]
JSON.stringify(obj);  // => '{"visible":true}'
{ ...obj };           // => { visible: true } — no private field
```

## Visibility

| Operation                        | Visible? |
| -------------------------------- | -------- |
| `Object.keys()`                  | No       |
| `JSON.stringify()`               | No       |
| `for...in`                       | No       |
| `{ ...obj }` spread              | No       |
| `Object.assign()`                | No       |
| `Object.getOwnPropertySymbols()` | Yes      |
| `Reflect.ownKeys()`              | Yes      |

## Naming Convention

Prefix private field accessors with `_` to signal internal use:

```ts
// Good
const _agentChainField = privateField<readonly AgentChainEntry[]>("funkai:agent-chain");
const _parentCtxField = privateField<ParentContext>("funkai:parent-ctx");

// Bad
const AGENT_CHAIN = privateField<...>(...);
const agentChain = privateField<...>(...);
```

## Property Descriptor

Fields are defined with:

```ts
{ enumerable: false, writable: true, configurable: true }
```

- **Non-enumerable** — hidden from iteration and spread
- **Writable** — allows `set()` to overwrite without delete+redefine
- **Configurable** — allows `remove()` to delete the property

The Symbol itself is the access control mechanism. Without the Symbol reference, the field cannot be read or written.

## Cross-Package Sharing

`Symbol.for()` creates global Symbols — two accessors with the same description share the same Symbol:

```ts
// package-a
const _field = privateField<string>("funkai:shared");

// package-b
const _field = privateField<string>("funkai:shared");

// Both read/write the same property
```

Use namespaced descriptions (e.g. `"funkai:agent-chain"`) to avoid collisions.
