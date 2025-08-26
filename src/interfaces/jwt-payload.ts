import { Role } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload extends Request {
  payload: {
    user_id: number;
    email: string;
    role: Role;
  };
}
