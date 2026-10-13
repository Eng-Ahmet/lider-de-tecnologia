import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { fullName, email, password, phoneNumber, role } = req.body;

      if (!email || !password || !fullName) {
        res.status(400).json({ error: 'Nombre completo, email y contraseña son obligatorios' });
        return;
      }

      const result = await userService.register({
        fullName,
        email,
        password,
        phoneNumber,
        role: role === 'Administrator' ? 'Administrator' : 'User',
      });

      res.status(201).json({
        success: true,
        message: '¡Usuario registrado correctamente!',
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Error en el registro' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        return;
      }

      const result = await userService.login(email, password);

      res.json({
        success: true,
        message: `¡Bienvenido de nuevo, ${result.user.fullName}!`,
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Error de autenticación' });
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const user = await userService.findById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      res.json({
        user: userService.toSafeUser(user),
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al recuperar perfil' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Sesión cerrada correctamente',
    });
  }
}

export const authController = new AuthController();
