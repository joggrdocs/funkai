/**
 * A type-safe accessor for a Symbol-keyed, non-enumerable field on plain objects.
 *
 * Private fields are invisible to `Object.keys()`, `JSON.stringify()`,
 * `for...in`, and object spread. The Symbol is the sole access key.
 *
 * @typeParam T - The type of the stored value.
 */
export interface PrivateField<T> {
  /**
   * The underlying Symbol used as the property key.
   *
   * Exposed for advanced use cases (e.g. debugging, custom descriptors).
   * Prefer the accessor methods for normal usage.
   */
  readonly symbol: symbol;

  /**
   * Read the private field from an object.
   *
   * @param obj - The object to read from.
   * @returns The stored value, or `undefined` if not present.
   *
   * @example
   * ```ts
   * const name = _nameField.get(params);
   * // => string | undefined
   * ```
   */
  get(obj: object): T | undefined;

  /**
   * Read the private field from an object with a fallback.
   *
   * @param obj - The object to read from.
   * @param defaultValue - Value to return when the field is absent.
   * @returns The stored value, or `defaultValue` if not present.
   *
   * @example
   * ```ts
   * const chain = _chainField.get(params, []);
   * // => always returns an array, never undefined
   * ```
   */
  get(obj: object, defaultValue: T): T;

  /**
   * Attach the private field to an object.
   *
   * Defines a non-enumerable property keyed by the internal Symbol.
   * Returns the same object reference for chaining. If the field
   * already exists, the value is overwritten.
   *
   * @param obj - The target object (must be owned by the caller).
   * @param value - The value to store.
   * @returns The same object reference.
   *
   * @example
   * ```ts
   * const params = _chainField.set({ prompt: "hello" }, [{ id: "root" }]);
   * ```
   */
  set<O extends object>(obj: O, value: T): O;

  /**
   * Check whether an object carries this private field.
   *
   * @param obj - The object to check.
   * @returns `true` if the Symbol-keyed property exists on the object.
   *
   * @example
   * ```ts
   * if (_chainField.has(params)) {
   *   // field is present
   * }
   * ```
   */
  has(obj: object): boolean;
}

/**
 * Create a type-safe accessor for a Symbol-keyed private field.
 *
 * The returned accessor provides `.get()`, `.set()`, and `.has()`
 * methods. The field is stored as a non-enumerable
 * property, invisible to `Object.keys()`, `JSON.stringify()`,
 * `for...in`, and object spread (`{ ...obj }`).
 *
 * Uses a unique `Symbol(description)` internally. Cross-package sharing
 * happens through module imports, not the global symbol registry.
 *
 * @typeParam T - The type of the stored value.
 * @param description - A namespaced key for the Symbol (e.g. `"funkai:agent-chain"`).
 * @returns A frozen {@link PrivateField} accessor.
 *
 * @example
 * ```ts
 * const _nameField = privateField<string>("my-lib:name");
 *
 * const obj = { visible: true };
 * _nameField.set(obj, "hidden-value");
 *
 * _nameField.get(obj);        // => "hidden-value"
 * _nameField.get({}, "fallback"); // => "fallback"
 * _nameField.has(obj);        // => true
 * Object.keys(obj);           // => ["visible"]
 * JSON.stringify(obj);        // => '{"visible":true}'
 * ```
 */
export function privateField<T>(description: string): PrivateField<T> {
  const sym = Symbol(description);

  function get(obj: object): T | undefined;
  function get(obj: object, defaultValue: T): T;
  function get(obj: object, defaultValue?: T): T | undefined {
    const record = obj as Record<symbol, unknown>;
    if (sym in obj) {
      return record[sym] as T;
    }
    return defaultValue;
  }

  function set<O extends object>(obj: O, value: T): O {
    // First call defines the descriptor; subsequent calls overwrite via assignment
    if (sym in obj) {
      (obj as Record<symbol, unknown>)[sym] = value;
    } else {
      Object.defineProperty(obj, sym, {
        value,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
    return obj;
  }

  function has(obj: object): boolean {
    return sym in obj;
  }

  return { symbol: sym, get, set, has };
}
