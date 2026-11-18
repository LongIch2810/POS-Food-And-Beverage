import { ExecutionContext, HttpException, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

// Same body as the old 429 so the error filter keeps answering with Retry-After.
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  // Fail-open: a Redis error is logged and the request goes on; only a real 429 is rethrown.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      new Logger('Throttler').warn(`Redis unavailable, skipping throttle: ${(error as Error).message}`);
      return true;
    }
  }

  protected async throwThrottlingException(_context: ExecutionContext, detail: ThrottlerLimitDetail): Promise<void> {
    const seconds = detail.isBlocked ? detail.timeToBlockExpire : detail.timeToExpire;
    throw new HttpException({ code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', retryAfter: seconds }, 429);
  }
}
