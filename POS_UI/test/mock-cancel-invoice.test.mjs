import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

test('[B-74][PB16-mock][BR-110] PAID cancellation throws and preserves all state', () => {
  const saved = new Map();
  const localStorage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  const modules = new Map();
  const load = name => {
    if (modules.has(name)) return modules.get(name);
    const source = readFileSync(new URL(`../src/mock/${name}.ts`, import.meta.url), 'utf8');
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    modules.set(name, exports);
    vm.runInNewContext(js, {
      exports, localStorage,
      require: path => load(path.replace('./', '')),
    });
    return exports;
  };
  const { MockEngine } = load('mockEngine');
  const { mockStorage } = load('mockStorage');
  const before = structuredClone(mockStorage.getState());

  assert.equal(before.invoices.find(invoice => invoice.id === 'inv-paid-1').status, 'PAID');
  assert.throws(() => MockEngine.cancelInvoice('inv-paid-1', 'Khách đổi ý'), {
    message: 'Đơn đã thanh toán không thể hủy.',
  });
  assert.deepEqual(structuredClone(mockStorage.getState()), before);
  assert.equal(saved.size, 0);
});
