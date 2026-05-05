// 用 class 而非 interface，避免 isolatedModules + emitDecoratorMetadata 下
// 装饰器参数类型只能是值（class）不能是纯类型（interface）的限制
export class AuthRequest extends (Request as any) {
  user: {
    id: string;
    email: string;
  };
}
