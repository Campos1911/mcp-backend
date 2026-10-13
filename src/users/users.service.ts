import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  private users: User[] = [];

  async findByEmail(email: string): Promise<User | undefined> {
    const normalized = email.toLowerCase().trim();
    return this.users.find((u) => u.email.toLowerCase() === normalized);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async create(name: string, email: string, passwordHash: string): Promise<User> {
    const newUser: User = {
      id: randomUUID(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }
}
