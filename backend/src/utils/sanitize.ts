import { User } from '../types';

export type SafeUser = Omit<User, 'passwordHash' | 'refreshToken'>;

/** Elimina campos sensibles del objeto usuario antes de enviarlo al cliente. */
export const sanitizeUser = (user: User): SafeUser => {
  const { passwordHash, refreshToken, ...safe } = user;
  return safe;
};
