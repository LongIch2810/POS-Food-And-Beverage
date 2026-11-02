import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, ReferenceObject, ResponseObject, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../../app.module';

test('DOC-01 PB-04 OpenAPI documents request, response envelopes and cursor query', async (t) => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  try {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('QA').setVersion('1').build());
    const schemas = doc.components!.schemas!;
    const responseSchema = (response: ResponseObject | ReferenceObject | undefined) => {
      assert.ok(response && !('$ref' in response));
      return response.content?.['application/json']?.schema;
    };
    assert.ok(schemas.BranchOutputDto, 'branch response schema');
    assert.ok(schemas.TableOutputDto, 'table response schema');
    assert.ok(schemas.StaffOutputDto, 'staff response schema');
    for (const path of ['/api/v1/branches', '/api/v1/dining-tables', '/api/v1/users']) {
      const get = doc.paths[path].get!;
      const params = get.parameters!.map(parameter => 'name' in parameter ? parameter.name : '');
      for (const name of ['limit', 'cursor', 'sort']) assert.ok(params.includes(name), `${path} ${name}`);
      assert.ok(responseSchema(get.responses['200']));
      assert.ok(responseSchema(get.responses['403']));
      assert.ok(responseSchema(doc.paths[path].post!.responses['201']));
    }
    assert.ok(responseSchema(doc.paths['/api/v1/users/{id}/reset-password'].post!.responses['200']));
    const usersList = responseSchema(doc.paths['/api/v1/users'].get!.responses['200']);
    assert.ok(usersList && 'anyOf' in usersList, 'empty users list must match either context without oneOf ambiguity');
    const propertyType = (model: string, field: string) => {
      const schema = schemas[model];
      assert.ok(schema && !('$ref' in schema));
      const property = schema.properties?.[field];
      assert.ok(property && !('$ref' in property));
      return property.type;
    };
    for (const model of ['CreateBranchDto', 'PatchBranchDto']) {
      assert.equal(propertyType(model, 'address'), 'string');
      assert.equal(propertyType(model, 'phone'), 'string');
      assert.equal(propertyType(model, 'initialCash'), 'integer');
    }
    for (const model of ['CreateTableDto', 'PatchTableDto']) {
      assert.equal(propertyType(model, 'area'), 'string');
      assert.equal(propertyType(model, 'capacity'), 'integer');
    }
    t.diagnostic(`OPENAPI ${JSON.stringify(doc)}`);
  } finally { await app.close(); }
});
