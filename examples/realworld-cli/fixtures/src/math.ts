/**
 * Add two numbers.
 */
export const add = (a: number, b: number): number => a + b;

/**
 * Subtract b from a.
 */
export const subtract = (a: number, b: number): number => a - b;

/**
 * Divide a by b. Throws if b is zero.
 */
export const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
};

/**
 * Calculate the factorial of n. Throws for negative numbers.
 */
export const factorial = (n: number): number => {
  if (n < 0) throw new Error("Negative factorial");
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};
