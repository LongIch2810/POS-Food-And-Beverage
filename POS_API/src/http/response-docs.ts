import { applyDecorators, Type } from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiQueryOptions, ApiResponse, getSchemaPath, SchemaObject } from '@nestjs/swagger';
import { ErrorResponseDto } from './api-response';

export class PageMetaDto {
  @ApiProperty({ type: 'integer' }) limit!: number;
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
  @ApiProperty({ type: 'integer' }) total!: number;
}

export function dataSchema(model: Type<unknown>): SchemaObject {
  return { type: 'object', required: ['data'], properties: { data: { $ref: getSchemaPath(model) } } };
}

export function listSchema(model: Type<unknown>): SchemaObject {
  return { type: 'object', required: ['data', 'meta'], properties: {
    data: { type: 'array', items: { $ref: getSchemaPath(model) } }, meta: { $ref: getSchemaPath(PageMetaDto) },
  } };
}

export function passwordSchema(model: Type<unknown>, key: 'owner' | 'user'): SchemaObject {
  return { type: 'object', required: ['data'], properties: { data: {
    type: 'object', required: [key, 'temporaryPassword'], properties: {
      [key]: { $ref: getSchemaPath(model) }, temporaryPassword: { type: 'string', minLength: 12 },
    },
  } } };
}

export function ApiListQuery(extra: ApiQueryOptions[] = []) {
  return applyDecorators(
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Mặc định20, tối đa100.' }),
    ApiQuery({ name: 'cursor', required: false, type: String }),
    ApiQuery({ name: 'sort', required: false, enum: ['-createdAt'] }),
    ApiQuery({ name: 'isActive', required: false, enum: ['true', 'false'], description: 'Bộ lọc trong context store.' }),
    ...extra.map(query => ApiQuery(query)),
  );
}

export function ApiErrors() {
  return applyDecorators(...[400, 401, 403, 404, 409, 422, 500, 503].map(status => ApiResponse({ status, type: ErrorResponseDto })));
}
