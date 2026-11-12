import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { errorResponse } from './api-response';
import { httpError } from './http-error';
import { verifySePayWebhookRequest } from '../sales/sepay-webhook.service';

const errors: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'Yêu cầu không đọc được.' },
  401: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập để tiếp tục.' },
  403: { code: 'PERMISSION_DENIED', message: 'Bạn không có quyền thực hiện thao tác này.' },
  404: { code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên.' },
  409: { code: 'CONFLICT', message: 'Dữ liệu đã thay đổi. Vui lòng thử lại.' },
  413: { code: 'FILE_TOO_LARGE', message: 'Dung lượng file tải lên vượt quá giới hạn cho phép (tối đa 2 MB).' },
  422: { code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không hợp lệ.' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' },
  503: { code: 'SERVICE_UNAVAILABLE', message: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.' },
};

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    exception = sePayParseFailure(exception, request);
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const custom = exception instanceof HttpException ? exception.getResponse() : null;
    const error = typeof custom === 'object' && custom !== null && 'code' in custom && 'message' in custom
      ? { code: String(custom.code), message: String(custom.message) }
      : errors[status] ?? { code: 'INTERNAL_ERROR', message: 'Hệ thống gặp lỗi. Vui lòng thử lại sau.' };
    const details = typeof custom === 'object' && custom !== null && 'details' in custom && Array.isArray(custom.details)
      ? custom.details : [];
    if (typeof custom === 'object' && custom !== null && 'retryAfter' in custom && typeof custom.retryAfter === 'number') {
      response.setHeader('Retry-After', Math.max(1, Math.ceil(custom.retryAfter)));
    }
    let requestId = response.getHeader('X-Request-Id');
    if (!requestId) {
      const suppliedId = request.header('X-Request-Id');
      requestId = suppliedId && /^[a-zA-Z0-9-]{1,80}$/.test(suppliedId) ? suppliedId : randomUUID();
      response.setHeader('X-Request-Id', requestId);
      Logger.log(`${request.method} ${request.path} ${status} requestId=${requestId}`, 'HTTP');
    }
    response.status(status).json(errorResponse(error, details, String(requestId)));
  }
}

// The framework JSON parser rejects malformed bodies before the webhook handler runs.
// Authenticate the raw body first, then report the SePay-specific payload error.
function sePayParseFailure(exception: unknown, request: Request): unknown {
  if (!(exception instanceof HttpException) || exception.getStatus() !== 400 || request.method !== 'POST'
    || request.path.replace(/\/$/, '').toLowerCase() !== '/api/v1/payments/sepay/webhook') return exception;
  const custom = exception.getResponse();
  if (typeof custom === 'object' && custom !== null && 'code' in custom) return exception;
  const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) return exception;
  try {
    verifySePayWebhookRequest(rawBody, request.header('X-SePay-Signature') ?? '', request.header('X-SePay-Timestamp') ?? '');
  } catch (error) {
    return error;
  }
  return httpError(400, 'INVALID_WEBHOOK_PAYLOAD', 'Nội dung webhook không hợp lệ.');
}
