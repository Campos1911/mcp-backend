import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Nome deve ser um texto' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsEmail({}, { message: 'E-mail informado é inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve conter pelo menos 6 caracteres' })
  password: string;
}
