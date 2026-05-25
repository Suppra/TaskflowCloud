import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/userRepository';
import { env } from '../config/env';
import { User, JwtPayload } from '../types';
import { RegisterInput, LoginInput } from '../validators/auth';

const SALT_ROUNDS = 12;

const signTokens = (payload: JwtPayload) => {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw Object.assign(new Error('El email ya está registrado'), { statusCode: 409 });

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const now = new Date().toISOString();

    const user: User = {
      userId: uuidv4(),
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      role: 'member',
      createdAt: now,
      updatedAt: now,
    };

    await userRepository.create(user);
    const { accessToken, refreshToken } = signTokens({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    await userRepository.update(user.userId, { refreshToken });
    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email.toLowerCase());
    if (!user) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });

    const { accessToken, refreshToken } = signTokens({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    await userRepository.update(user.userId, { refreshToken, updatedAt: new Date().toISOString() });
    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

  async refreshTokens(token: string) {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw Object.assign(new Error('Refresh token inválido'), { statusCode: 401 });
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || user.refreshToken !== token) {
      throw Object.assign(new Error('Refresh token revocado'), { statusCode: 401 });
    }

    const { accessToken, refreshToken } = signTokens({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    await userRepository.update(user.userId, { refreshToken });
    return { accessToken, refreshToken };
  },

  async logout(userId: string) {
    await userRepository.update(userId, { refreshToken: undefined });
  },
};

const sanitizeUser = (user: User) => {
  const { passwordHash, refreshToken, ...safe } = user;
  void passwordHash;
  void refreshToken;
  return safe;
};
