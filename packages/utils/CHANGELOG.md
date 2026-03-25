# @funkai/utils

## 0.0.1

### Patch Changes

- ef51bd7: fix(packages/utils): fix privateField JSDoc and switch to unique symbols

  - Remove non-existent `.remove()` method from `privateField` JSDoc
  - Change `Symbol.for()` to `Symbol()` for per-instance uniqueness (sharing via module imports, not global registry)
