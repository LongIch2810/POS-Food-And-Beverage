import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { requestValidationPipe } from '../../http/request-validation';
import { CreateBranchDto, CreateTableDto, PatchBranchDto, PatchTableDto } from '../http/organization.dto';
import { CreateStaffDto, PatchStaffDto } from '../../users/http/users.dto';

test('DOC-02 AUD-05 per-endpoint errors and executable DTO examples match approved contract', async t => {
  let endpoints = 0;
  for (const file of ['organization.md', 'users.md']) {
    const text = readFileSync(resolve(__dirname, '../../../../.devloopflow/specs', file), 'utf8');
    for (const section of text.split(/(?=^### (?:GET|POST|PATCH) \/api\/v1\/)/m).slice(1)) {
      const title = section.split('\n')[0];
      const [, method, path] = /^### (GET|POST|PATCH) (\S+)/.exec(title)!;
      if (method === 'GET') {
        assert.doesNotMatch(section, /^\| 409 \|/m, `${title} does not create unique conflicts`);
        assert.doesNotMatch(section, /^\| 503 \|/m, `${title} does not require a target role lookup`);
      }
      if (method === 'PATCH' && path === '/api/v1/users/{id}') {
        assert.doesNotMatch(section, /platform theo specs\/platform\.md/, 'PATCH users is store-only');
        assert.doesNotMatch(section, /USERNAME_EXISTS/, 'PATCH staff cannot edit username');
      }
      if (path.endsWith('/reset-password')) assert.doesNotMatch(section, /^\| 503 \|/m, 'reset uses existing target role');
      const request = /```http\r?\n([\s\S]*?)```/.exec(section)?.[1];
      const response = /```json\r?\n([\s\S]*?)```/.exec(section)?.[1];
      assert.ok(request && response, `${title} has concrete request and response JSON example`);
      assert.ok(request.startsWith(`${method} `));
      const responseBody = JSON.parse(response);
      assert.ok('data' in responseBody);
      if (method === 'GET') {
        assert.ok(Array.isArray(responseBody.data)); assert.equal(responseBody.meta.nextCursor, null);
      } else if (!path.endsWith('/reset-password')) {
        assert.match(section, /^\| 400 \| BAD_REQUEST \|/m, 'body endpoints document parser/content-type error');
        const rawBody = request.split(/\r?\n\r?\n/).slice(1).join('\n\n').trim();
        assert.ok(rawBody, `${title} example contains JSON body`);
        const body = JSON.parse(rawBody);
        const metatype = path.includes('/branches') ? method === 'POST' ? CreateBranchDto : PatchBranchDto
          : path.includes('/dining-tables') ? method === 'POST' ? CreateTableDto : PatchTableDto
          : method === 'POST' ? CreateStaffDto : PatchStaffDto;
        await requestValidationPipe.transform(body, { type: 'body', metatype });
      }
      t.diagnostic(JSON.stringify({ kind: 'SPEC_EXAMPLE', file, method, path, validRequestDto: true, responseJsonParsed: true }));
      endpoints++;
    }
  }
  assert.equal(endpoints, 10);
});
