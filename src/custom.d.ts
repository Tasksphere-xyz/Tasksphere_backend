import { Request } from 'express';
import { UserRole } from './entities/user.entity';

declare module 'express' {
  interface UserPayload {
    email: string;
    role: UserRole;
  }

  interface Request {
    user?: UserPayload;
    isAuthenticated?: boolean;
  }
}
