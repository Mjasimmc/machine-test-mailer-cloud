import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId || request.tenantId || request.user?.id;
    if (!tenantId) {
      throw new UnauthorizedException('No tenant context found in authenticated session');
    }
    return tenantId;
  },
);
