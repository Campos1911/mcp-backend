import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AppException } from '../common/exceptions/app-exception.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new AppException('AUTH_NAME_REQUIRED', 'Nome é obrigatório', HttpStatus.BAD_REQUEST);
    }
    if (!dto.email || !dto.email.includes('@')) {
      throw new AppException('AUTH_INVALID_EMAIL', 'E-mail informado é inválido', HttpStatus.BAD_REQUEST);
    }
    if (!dto.password || dto.password.length < 6) {
      throw new AppException(
        'AUTH_WEAK_PASSWORD',
        'A senha deve conter pelo menos 6 caracteres',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new AppException(
        'USER_ALREADY_EXISTS',
        'Já existe um usuário cadastrado com este e-mail',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.name, dto.email, passwordHash);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async login(dto: LoginDto) {
    if (!dto.email || !dto.password) {
      throw new AppException(
        'AUTH_CREDENTIALS_REQUIRED',
        'E-mail e senha são obrigatórios',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Credenciais inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Credenciais inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }
}
