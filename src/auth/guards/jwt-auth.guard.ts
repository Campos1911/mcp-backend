import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppException } from '../../common/exceptions/app-exception.js';

export interface AuthenticatedUser {
  sub: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new AppException(
        'UNAUTHORIZED',
        'Token de autorização não fornecido no cabeçalho Authorization',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new AppException(
        'INVALID_TOKEN_FORMAT',
        'Formato do token inválido. Esperado: Bearer <token>',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      request.user = payload;
      return true;
    } catch {
      throw new AppException(
        'INVALID_TOKEN',
        'Token JWT inválido ou expirado',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
