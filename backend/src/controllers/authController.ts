import { Response } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from '../validators/auth';
import { userRepository } from '../repositories/userRepository';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const authController = {
  async register(req: AuthRequest, res: Response) {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    return sendCreated(res, result, 'Usuario registrado correctamente');
  },

  async login(req: AuthRequest, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    return sendSuccess(res, result, 'Sesión iniciada correctamente');
  },

  async refresh(req: AuthRequest, res: Response) {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refreshTokens(refreshToken);
    return sendSuccess(res, tokens);
  },

  async logout(req: AuthRequest, res: Response) {
    await authService.logout(req.user!.userId);
    return sendSuccess(res, null, 'Sesión cerrada correctamente');
  },

  async me(req: AuthRequest, res: Response) {
    const user = await userRepository.findById(req.user!.userId);
    if (!user) return sendError(res, 'Usuario no encontrado', 404);
    const { passwordHash, refreshToken, ...safe } = user;
    void passwordHash; void refreshToken;
    return sendSuccess(res, safe);
  },

  async updateProfile(req: AuthRequest, res: Response) {
    const input = updateProfileSchema.parse(req.body);
    const updated = await userRepository.update(req.user!.userId, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) return sendError(res, 'Usuario no encontrado', 404);
    const { passwordHash, refreshToken, ...safe } = updated;
    void passwordHash; void refreshToken;
    return sendSuccess(res, safe, 'Perfil actualizado');
  },
};
