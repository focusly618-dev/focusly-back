import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType().toString() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext<{
        req: Record<string, any>;
        res: Record<string, any>;
      }>();
      return { req: ctx.req, res: ctx.res };
    }
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Record<string, any>>(),
      res: http.getResponse<Record<string, any>>(),
    };
  }
}
