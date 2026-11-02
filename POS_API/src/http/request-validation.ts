import { CanActivate, ExecutionContext, HttpException, Injectable, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { httpError } from './http-error';

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validId(id: string): string {
  if (!uuidPattern.test(id)) throw httpError(422, 'VALIDATION_ERROR', 'Mã tài nguyên không hợp lệ.');
  return id;
}

export function noInput(request: Request, allowQuery = false): void {
  if ((!allowQuery && Object.keys(request.query).length) || request.body !== undefined
    || Number(request.header('Content-Length')) > 0 || request.header('Transfer-Encoding')) {
    throw httpError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.');
  }
}

export function jsonInput(request: Request, patch = false): void {
  if (request.header('Content-Type')?.split(';')[0] !== 'application/json') {
    throw httpError(400, 'BAD_REQUEST', 'Yêu cầu không đọc được.');
  }
  if (Object.keys(request.query).length || !request.body || typeof request.body !== 'object'
    || Array.isArray(request.body) || (patch && !Object.keys(request.body).length)) {
    throw httpError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.');
  }
}

@Injectable()
export class JsonBodyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Content-Type phải được kiểm tra trước parameter pipes của DTO.
    if (request.method !== 'GET' && request.method !== 'HEAD') jsonInput(request, request.method === 'PATCH');
    return true;
  }
}

export const requestValidationPipe = new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true,
  exceptionFactory: errors => new HttpException({
    code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không hợp lệ.',
    details: errors.map(error => ({ location: 'body', field: error.property, message: 'Giá trị không hợp lệ.' })),
  }, 422),
});
