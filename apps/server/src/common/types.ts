import type { Request } from 'express';

/** Express Request 扩展：JWT 解析后的用户信息挂在 req.user 上 */
export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}
