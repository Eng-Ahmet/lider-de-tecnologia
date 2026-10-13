import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, SafeUser, AuthResponse, UserRole } from '../types/user.js';
import { config } from '../config/config.js';

export class UserService {
  private users: User[] = [];

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    const adminPasswordHash = bcrypt.hashSync('Admin123!', 10);
    const userPasswordHash = bcrypt.hashSync('Vecino123!', 10);

    this.users = [
      {
        id: 'USR-ADMIN-01',
        fullName: 'Marta Gómez (Técnica Municipal)',
        email: 'admin@callefix.malaga.es',
        passwordHash: adminPasswordHash,
        phoneNumber: '+34 951 92 60 10',
        role: 'Administrator',
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'USR-VECINO-01',
        fullName: 'Carlos Moreno',
        email: 'vecino@malaga.es',
        passwordHash: userPasswordHash,
        phoneNumber: '+34 612 34 56 78',
        role: 'User',
        isActive: true,
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'USR-VECINO-02',
        fullName: 'Elena Ramos',
        email: 'elena.ramos@ejemplo.es',
        passwordHash: userPasswordHash,
        phoneNumber: '+34 689 11 22 33',
        role: 'User',
        isActive: true,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async register(params: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    role?: UserRole;
  }): Promise<AuthResponse> {
    const existing = await this.findByEmail(params.email);
    if (existing) {
      throw new Error('Ya existe una cuenta con este correo electrónico');
    }

    if (!params.fullName || params.fullName.trim().length < 2) {
      throw new Error('El nombre completo debe tener al menos 2 caracteres');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const passwordHash = bcrypt.hashSync(params.password, 10);
    const newUser: User = {
      id: `USR-${uuidv4().substring(0, 8)}`,
      fullName: params.fullName.trim(),
      email: params.email.trim().toLowerCase(),
      passwordHash,
      phoneNumber: params.phoneNumber?.trim(),
      role: params.role || 'User',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    const token = this.generateToken(newUser);

    return {
      user: this.toSafeUser(newUser),
      token,
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('Credenciales inválidas (usuario o contraseña incorrectos)');
    }

    if (!user.isActive) {
      throw new Error('Esta cuenta ha sido desactivada. Contacte con el soporte municipal.');
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Credenciales inválidas (usuario o contraseña incorrectos)');
    }

    const token = this.generateToken(user);
    return {
      user: this.toSafeUser(user),
      token,
    };
  }

  generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  getAllUsers(): SafeUser[] {
    return this.users.map(u => this.toSafeUser(u));
  }
}

export const userService = new UserService();
