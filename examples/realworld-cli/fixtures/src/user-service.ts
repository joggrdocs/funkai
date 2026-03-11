export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

const users: Map<string, User> = new Map();

/**
 * Create a new user.
 */
export const createUser = (name: string, email: string): User => {
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    createdAt: new Date(),
  };
  users.set(user.id, user);
  return user;
};

/**
 * Find a user by ID. Returns undefined if not found.
 */
export const findUser = (id: string): User | undefined => users.get(id);

/**
 * Find a user by email. Returns undefined if not found.
 */
export const findUserByEmail = (email: string): User | undefined =>
  [...users.values()].find((u) => u.email === email);

/**
 * Delete a user by ID. Returns true if deleted, false if not found.
 */
export const deleteUser = (id: string): boolean => users.delete(id);
