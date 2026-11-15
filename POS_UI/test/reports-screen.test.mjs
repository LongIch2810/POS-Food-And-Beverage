import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as clientModule from '../src/http/client.ts';
import { reportService as realReportService } from '../src/features/reports/reportService.ts';
import { shiftService as realShiftService } from '../src/services/shiftService.ts';
import { reportScope as realReportScope } from '../src/app/navigation.ts';

const source = readFileSync(new URL('../src/features/reports/DailyReportScreen.tsx', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;

// Harness React tối giản: hook theo thứ tự, effect chạy sau render, setState đánh dấu dirty.
function mount({ strict = false, permissions, role = 'CASHIER', realClient = false, now = '2026-11-13T18:00:00.000Z', branchId = 'branch-b', userId = 'user-a' }) {
  const slots = [], pending = { reports: [], current: [], shifts: [], branches: [] };
  let strictDone = false, index = 0, dirty = true, effects = [], tree, unmounted = false, updatesAfterUnmount = 0;
  const snapshots = []; // text của từng lần render, chụp TRƯỚC khi effect chạy
  const React = {
    Fragment: 'Fragment',
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(value) {
      const key = index++;
      slots[key] ??= { value: typeof value === 'function' ? value() : value };
      return [slots[key].value, next => {
        if (unmounted) updatesAfterUnmount++;
        next = typeof next === 'function' ? next(slots[key].value) : next;
        if (!Object.is(next, slots[key].value)) { slots[key].value = next; dirty = true; }
      }];
    },
    useRef(value) { return slots[index++] ??= { current: value }; },
    useEffect(fn, deps) {
      const key = index++, old = slots[key];
      if (!old || !old.deps || deps.some((value, i) => !Object.is(value, old.deps[i]))) effects.push(() => { old?.cleanup?.(); slots[key] = { deps, fn, cleanup: fn() }; });
    },
  };
  const session = { user: { id: userId, store_id: 'store', branch_id: branchId, role_code: role }, permissions, branch_name: 'Chi nhánh B' };
  const identity = { identity: userId, epoch: 1 };
  const defer = (list, extra) => new Promise((resolve, reject) => list.push({ ...extra, resolve, reject }));
  class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return new Date(now).getTime(); } }
  const exports = {};
  vm.runInNewContext(js, { exports, Date: FakeDate, JSON, Intl, Number, String, Math, Object, Array, Promise, require: path => {
    if (path === 'react') return React;
    if (path.endsWith('app/navigation')) return { reportScope: realReportScope };
    if (path.endsWith('http/client')) return { GENERIC_ERROR_MESSAGE: clientModule.GENERIC_ERROR_MESSAGE };
    if (realClient && path.endsWith('reportService')) return { reportService: realReportService };
    if (realClient && path.endsWith('shiftService')) return { shiftService: { ...realShiftService, getCurrentShift: () => defer(pending.current, {}) } };
    if (path.endsWith('reportService')) return { reportService: { getRevenue: query => defer(pending.reports, { query }) } };
    if (path.endsWith('shiftService')) return { shiftService: {
      getCurrentShift: () => defer(pending.current, {}),
      getShifts: query => defer(pending.shifts, { query }),
    } };
    if (path.endsWith('organizationService')) return { organizationService: { getBranchChoices: () => defer(pending.branches, {}) } };
    if (path.endsWith('AuthContext')) return { useAuth: () => ({ session }) };
    if (path.endsWith('session-events')) return { getRequestIdentity: () => identity };
    if (path.endsWith('formatters')) return { formatVND: value => `VND:${value}`, formatDateTimeVN: value => `T:${value}` };
    const name = path.split('/').at(-1); return { [name]: name };
  } });
  const render = () => {
    for (let n = 0; dirty; n++) {
      assert.ok(n < 30, 'render loop');
      dirty = false; index = 0; effects = [];
      const wrapper = exports.DailyReportScreen(); tree = wrapper.type(wrapper.props); snapshots.push(text(tree)); effects.forEach(fn => fn());
      if (strict && !strictDone) { strictDone = true; slots.forEach(slot => { if (slot?.fn) { slot.cleanup?.(); slot.cleanup = slot.fn(); } }); } // React 18 StrictMode: mount, cleanup, mount lại
    }
  };
  const flush = async () => { for (let n = 0; n < 6; n++) { render(); await Promise.resolve(); } render(); };
  // Component hàm thuần (không hook) được bung ra như React sẽ làm.
  const expand = node => node && typeof node === 'object' && !Array.isArray(node) && typeof node.type === 'function' ? expand(node.type(node.props)) : node;
  const find = (type, predicate = () => true, node = tree) => {
    node = expand(node);
    if (Array.isArray(node)) return node.map(child => find(type, predicate, child ?? null)).find(Boolean);
    if (!node || typeof node !== 'object') return;
    if ((type === '*' || node.type === type) && predicate(node.props ?? {})) return node;
    return node.props?.children ? find(type, predicate, node.props.children) : undefined;
  };
  const text = (node) => (node = expand(node), Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '');
  const all = (type, predicate = () => true, node = tree) => {
    node = expand(node);
    if (Array.isArray(node)) return node.flatMap(child => all(type, predicate, child ?? null));
    if (!node || typeof node !== 'object') return [];
    return [...((type === '*' || node.type === type) && predicate(node.props ?? {}) ? [node] : []), ...(node.props?.children ? all(type, predicate, node.props.children) : [])];
  };
  const field = (label) => find('*', props => props['aria-label'] === label);
  const change = async (label, value) => {
    if (['Ngày báo cáo', 'Biểu đồ từ ngày', 'Biểu đồ đến ngày'].includes(label) && /^\d{4}-\d{2}-\d{2}$/.test(value)) value = value.split('-').reverse().join('/');
    field(label).props.onChange({ target: { value } }); await flush();
  };
  const click = async label => { find('button', props => text(props.children).includes(label)).props.onClick(); await flush(); };
  const unmount = () => { unmounted = true; slots.forEach(slot => slot?.cleanup?.()); };
  return { session, identity, pending, snapshots, render, flush, find, all, text: () => text(tree), textOf: text, field, change, click, unmount, get updatesAfterUnmount() { return updatesAfterUnmount; }, get dirty() { return dirty; }, touch() { dirty = true; } };
}

test('test_ST3_AC1_service_shell_permissions screen deny: không quyền, admin hoặc thiếu access_all không gọi báo cáo/ca/chi nhánh', async () => {
  for (const [permissions, role] of [[[], 'CASHIER'], [['report.view_all', 'branch.access_all'], 'PLATFORM_ADMIN'], [['report.view_all'], 'OWNER']]) {
    const screen = mount({ permissions, role });
    await screen.flush();
    const total = Object.values(screen.pending).reduce((sum, list) => sum + list.length, 0);
    assert.equal(total, 0, `${role} ${permissions} gọi API`);
    assert.match(screen.text(), /Không có quyền/);
    assert.equal(screen.find('DataTable'), undefined);
  }
});

const plain = value => JSON.parse(JSON.stringify(value));
const shift = (id, extra = {}) => ({ id, branchId: 'branch-b', userId: 'user-a', shiftType: 'CASHIER', startedAt: `2026-11-${String(10 + (extra.n ?? 0)).padStart(2, '0')}T01:00:00.000Z`, endedAt: null, status: 'CLOSED', ...extra });
const shiftPage = (data, nextCursor = null) => ({ data, meta: { limit: 100, nextCursor, total: data.length } });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' ? [node] : [];
const optionValues = (screen, label) => flatten(screen.field(label).props.children).filter(node => node.type === 'option').map(node => node.props.value);
const emptyReport = (date = '2026-11-14') => ({ date, invoiceCount: 0, totalRevenue: 0, cashRevenue: 0, transferRevenue: 0, dailyRevenue: [], bestSellers: [] });

test('test_ST3_AC2_defaults_no_shift: 13/11 18:00Z là ngày 14/11 VN, chart 08..14, không ca thì rỗng và không GET báo cáo', async () => {
  const screen = mount({ permissions: ['report.view_shift'] });
  await screen.flush();
  assert.equal(screen.field('Ngày báo cáo').props.value, '14/11/2026');
  assert.equal(screen.field('Biểu đồ từ ngày').props.value, '08/11/2026');
  assert.equal(screen.field('Biểu đồ đến ngày').props.value, '14/11/2026');
  assert.equal(screen.pending.current.length, 1);
  assert.equal(screen.pending.shifts.length, 1);
  assert.deepEqual(plain(screen.pending.shifts[0].query), { limit: 100, shiftType: 'CASHIER', userId: 'user-a' });
  assert.equal(screen.pending.reports.length, 0, 'chưa có ca thì chưa gọi báo cáo');
  screen.pending.current[0].resolve(null);
  screen.pending.shifts[0].resolve(shiftPage([]));
  await screen.flush();
  assert.equal(screen.pending.reports.length, 0);
  assert.match(screen.text(), /Chưa có ca thu ngân/);
  assert.equal(screen.find('DataTable'), undefined);
});

test('test_ST3_AC2_shift_pages_current: current OPEN ngoài trang đầu >100 ca được chọn, tải thêm theo cursor giữ user, STAFF/không current lấy ca gần nhất', async () => {
  const history = Array.from({ length: 100 }, (_, i) => shift(`h${i + 1}`, { n: 1 }));
  const screen = mount({ permissions: ['report.view_shift'] });
  await screen.flush();
  screen.pending.current[0].resolve(shift('cur', { status: 'OPEN', n: 5 }));
  screen.pending.shifts[0].resolve(shiftPage(history, 'cursor-1'));
  await screen.flush();
  assert.equal(screen.pending.reports.length, 1);
  assert.equal(screen.pending.reports[0].query.shiftId, 'cur', 'current không nằm trong trang đầu vẫn được chọn');
  assert.equal(screen.pending.reports[0].query.branchId, undefined);
  assert.equal(optionValues(screen, 'Ca thu ngân').length, 101);
  await screen.click('Tải thêm ca');
  assert.equal(screen.pending.shifts.length, 2);
  assert.deepEqual(plain(screen.pending.shifts[1].query), { limit: 100, shiftType: 'CASHIER', userId: 'user-a', cursor: 'cursor-1' });
  screen.pending.shifts[1].resolve(shiftPage([shift('h101', { n: 1 }), shift('h1', { n: 1 })]));
  await screen.flush();
  assert.equal(optionValues(screen, 'Ca thu ngân').length, 102, 'gộp trang, không trùng ca');
  assert.equal(screen.pending.reports.length, 1, 'tải thêm không đổi ca đã chọn');
  assert.equal(screen.find('button', p => screen.textOf(p.children).includes('Tải thêm ca')), undefined, 'hết cursor thì ẩn nút');

  for (const current of [null, shift('staff', { shiftType: 'STAFF', status: 'OPEN', n: 6 })]) {
    const other = mount({ permissions: ['report.view_shift'] });
    await other.flush();
    other.pending.current[0].resolve(current);
    other.pending.shifts[0].resolve(shiftPage([shift('latest', { n: 4 }), shift('older', { n: 2 })]));
    await other.flush();
    assert.equal(other.pending.reports[0].query.shiftId, 'latest');
  }
});

test('test_ST3_AC3_filters_independent_range: scope theo quyền, range độc lập với ngày/món, range sai không gửi', async () => {
  // owner all: chọn chi nhánh gồm cả chi nhánh ngưng hoạt động, không gửi branchId khi chọn tất cả
  const owner = mount({ permissions: ['report.view_all', 'branch.access_all'], role: 'OWNER', branchId: null });
  await owner.flush();
  assert.equal(owner.pending.branches.length, 1);
  assert.equal(owner.pending.shifts.length + owner.pending.current.length, 0, 'owner không nạp ca');
  assert.equal(owner.pending.reports.length, 1);
  assert.equal(owner.pending.reports[0].query.branchId, undefined);
  assert.equal(owner.pending.reports[0].query.shiftId, undefined);
  owner.pending.branches[0].resolve([{ id: 'b1', name: 'Chi nhánh 1', isActive: false }, { id: 'b2', name: 'Chi nhánh 2', isActive: true }]);
  await owner.flush();
  assert.deepEqual(optionValues(owner, 'Chi nhánh'), ['', 'b1', 'b2']);
  await owner.change('Chi nhánh', 'b2');
  assert.equal(owner.pending.reports.at(-1).query.branchId, 'b2');
  await owner.change('Chi nhánh', '');
  assert.equal(owner.pending.reports.at(-1).query.branchId, undefined);

  // đổi range chỉ đổi range; đổi ngày không đổi range; request mang đúng date độc lập
  await owner.change('Biểu đồ từ ngày', '2026-11-01');
  await owner.change('Biểu đồ đến ngày', '2026-11-07');
  let last = plain(owner.pending.reports.at(-1).query);
  assert.deepEqual(last, { date: '2026-11-14', fromDate: '2026-11-01', toDate: '2026-11-07' });
  await owner.change('Ngày báo cáo', '2026-11-13');
  last = plain(owner.pending.reports.at(-1).query);
  assert.deepEqual(last, { date: '2026-11-13', fromDate: '2026-11-01', toDate: '2026-11-07' });
  assert.equal(owner.field('Biểu đồ từ ngày').props.value, '01/11/2026');

  // range hợp lệ 1 và 31 ngày được gửi; đảo, 32 ngày, trống thì không gửi và lỗi gắn đúng field
  const sent = () => owner.pending.reports.length;
  const error = id => owner.find('*', p => p.id === id);
  await owner.change('Biểu đồ từ ngày', '2026-11-07');
  assert.equal(owner.pending.reports.at(-1).query.fromDate, '2026-11-07', 'range 1 ngày');
  await owner.change('Biểu đồ từ ngày', '2026-10-08'); await owner.change('Biểu đồ đến ngày', '2026-11-07');
  assert.equal(owner.pending.reports.at(-1).query.fromDate, '2026-10-08', 'range 31 ngày');
  for (const [label, value, errorId] of [['Biểu đồ từ ngày', '2026-10-07', 'report-to-error'], ['Biểu đồ từ ngày', '2026-11-08', 'report-to-error'], ['Biểu đồ từ ngày', '', 'report-from-error'], ['Ngày báo cáo', '', 'report-date-error'], ['Ngày báo cáo', '2026-02-30', 'report-date-error']]) {
    const before = sent();
    await owner.change(label, value);
    assert.equal(sent(), before, `${label}=${value} không được gửi`);
    assert.ok(error(errorId), `${errorId} hiện lỗi`);
    const input = label === 'Ngày báo cáo' ? owner.field(label) : errorId === 'report-to-error' ? owner.field('Biểu đồ đến ngày') : owner.field(label);
    assert.equal(input.props['aria-invalid'], true);
    assert.equal(input.props['aria-describedby'], errorId);
    await owner.change(label, label === 'Ngày báo cáo' ? '2026-11-13' : '2026-10-08');
    assert.equal(error(errorId), undefined, 'hết lỗi khi sửa lại');
  }

  // manager: không bộ chọn chi nhánh, không nạp danh sách chi nhánh, không gửi branchId/shiftId
  const manager = mount({ permissions: ['report.view_branch'], role: 'MANAGER' });
  await manager.flush();
  assert.equal(manager.pending.branches.length + manager.pending.shifts.length, 0);
  assert.equal(manager.pending.reports.length, 1);
  assert.deepEqual(plain(manager.pending.reports[0].query), { date: '2026-11-14', fromDate: '2026-11-08', toDate: '2026-11-14' });
  assert.equal(manager.field('Chi nhánh'), undefined);
  assert.equal(manager.field('Ca thu ngân'), undefined);

  // cashier: chỉ ca của mình, đổi ca đổi shiftId
  const cashier = mount({ permissions: ['report.view_shift'] });
  await cashier.flush();
  cashier.pending.current[0].resolve(null);
  cashier.pending.shifts[0].resolve(shiftPage([shift('mine-1', { n: 3 }), shift('theirs', { n: 4, userId: 'user-z' }), shift('mine-2', { n: 2 })]));
  await cashier.flush();
  assert.deepEqual(optionValues(cashier, 'Ca thu ngân'), ['mine-1', 'mine-2']);
  await cashier.change('Ca thu ngân', 'mine-2');
  assert.equal(cashier.pending.reports.at(-1).query.shiftId, 'mine-2');
  assert.equal(cashier.field('Chi nhánh'), undefined);
});

const day = (n) => `2026-11-${String(n).padStart(2, '0')}`;
export const revenueFixture = () => ({
  date: '2026-11-14', invoiceCount: 3, totalRevenue: 85000, cashRevenue: 35000, transferRevenue: 50000,
  dailyRevenue: [8, 9, 10, 11, 12, 13, 14].map(n => ({ date: day(n), revenue: n === 10 ? 120000 : n === 14 ? 85000 : 0 })),
  bestSellers: [
    { productSizeId: 'ps-1', productName: 'Cà phê sữa', sizeName: 'L', quantity: 4, revenue: 35000 },
    { productSizeId: 'ps-2', productName: 'Cà phê sữa', sizeName: 'M', quantity: 2, revenue: 16000 },
  ],
});

test('test_ST3_AC4_render_numbers_chart_sizes: số liệu, chart đủ ngày và bảng size render từ API, không tính lại ở client', async () => {
  const screen = mount({ permissions: ['report.view_branch'], role: 'MANAGER' });
  await screen.flush();
  assert.match(screen.text(), /Đang tải báo cáo/);
  screen.pending.reports[0].resolve(revenueFixture());
  await screen.flush();
  const text = screen.text();
  assert.doesNotMatch(text, /Đang tải báo cáo/);
  for (const expected of ['VND:85000', 'VND:35000', 'VND:50000', '3 hóa đơn', 'Doanh thu món và topping trước giảm giá']) assert.ok(text.includes(expected), `thiếu ${expected}`);
  assert.doesNotMatch(text, /demo|mẫu|undefined|NaN/i);

  // chart: đủ 7 ngày, ngày zero vẫn có nhãn và giá trị, trục có max và 0, đọc được bằng bàn phím (vùng focus được)
  const chart = screen.find('*', p => p['aria-label'] === 'Doanh thu theo ngày');
  assert.equal(chart.props.tabIndex, 0);
  const bars = screen.all('li', p => String(p.className).includes('report-bar'));
  assert.equal(bars.length, 7);
  assert.deepEqual(bars.map(bar => screen.textOf(bar).match(/\d\d\/11\/2026/)?.[0]), ['08/11/2026', '09/11/2026', '10/11/2026', '11/11/2026', '12/11/2026', '13/11/2026', '14/11/2026']);
  assert.ok(screen.textOf(bars[0]).includes('VND:0'));
  assert.ok(screen.textOf(bars[2]).includes('VND:120000'));
  const axis = screen.textOf(screen.find('*', p => String(p.className).includes('report-chart-axis')));
  assert.ok(axis.includes('VND:120000') && axis.includes('VND:0'));
  const heights = bars.map(bar => screen.find('*', p => String(p.className).includes('report-bar-fill'), bar).props.style.height);
  assert.deepEqual([heights[0], heights[2], heights[6]], ['0%', '100%', '70.83333333333333%']);

  // bảng size: callback render thật từng cột
  const table = screen.find('DataTable');
  assert.equal(table.props.data.length, 2);
  assert.deepEqual(plain(table.props.columns.map(c => c.header)), ['Món', 'Size', 'Số lượng', 'Doanh thu món và topping trước giảm giá']);
  const cells = table.props.columns.map(column => screen.textOf(column.render(table.props.data[0], 0)));
  assert.deepEqual(plain(cells), ['Cà phê sữa', 'L', '4', 'VND:35000']);
  assert.equal(table.props.keyExtractor(table.props.data[1]), 'ps-2');
});

const apiError = (message, requestId) => Object.assign(new Error(message), { code: 'INTERNAL_ERROR', status: 500, requestId, details: [] });
const FALLBACK = 'Không tải được báo cáo. Vui lòng thử lại.';
const alertText = screen => screen.textOf(screen.all('*', p => p.role === 'alert'));

test('test_ST3_AC5_report_errors_empty_retry: loading, giữ message/requestId, fallback, thử lại đúng query, rỗng vẫn hiện số 0', async () => {
  const screen = mount({ permissions: ['report.view_branch'], role: 'MANAGER' });
  await screen.flush();
  assert.match(screen.text(), /Đang tải báo cáo/);
  screen.pending.reports[0].resolve(revenueFixture());
  await screen.flush();
  await screen.change('Ngày báo cáo', '2026-11-13');
  assert.equal(screen.find('DataTable'), undefined, 'không giữ số liệu của ngày trước khi tải');
  assert.match(screen.text(), /Đang tải báo cáo/);
  const failed = screen.pending.reports.at(-1);
  failed.reject(apiError('Máy chủ chưa tải được báo cáo.', 'req-reports-1'));
  await screen.flush();
  assert.match(alertText(screen), /Máy chủ chưa tải được báo cáo\./);
  assert.match(alertText(screen), /req-reports-1/);
  assert.doesNotMatch(screen.text(), /Đang tải báo cáo/);
  assert.equal(screen.find('DataTable'), undefined);
  assert.doesNotMatch(screen.text(), /VND:85000/);

  const before = screen.pending.reports.length;
  await screen.click('Thử lại');
  assert.equal(screen.pending.reports.length, before + 1);
  assert.deepEqual(plain(screen.pending.reports.at(-1).query), plain(failed.query), 'thử lại đúng query đang chọn');
  assert.match(screen.text(), /Đang tải báo cáo/);
  assert.equal(alertText(screen), '', 'lỗi cũ biến mất khi thử lại');

  for (const [error, expected, id] of [[new Error(''), FALLBACK, null], [apiError('', 'req-no-message'), FALLBACK, 'req-no-message'], [undefined, FALLBACK, null]]) {
    screen.pending.reports.at(-1).reject(error);
    await screen.flush();
    assert.ok(alertText(screen).includes(expected), `fallback cho ${error}`);
    if (id) assert.ok(alertText(screen).includes(id));
    assert.doesNotMatch(alertText(screen), /undefined|null/);
    await screen.click('Thử lại');
  }
  screen.pending.reports.at(-1).resolve(emptyReport('2026-11-13'));
  await screen.flush();
  assert.equal(alertText(screen), '');
  assert.ok(screen.text().includes('VND:0'));
  assert.match(screen.text(), /0 hóa đơn hoàn tất/);
  assert.equal(screen.find('DataTable').props.data.length, 0);
  assert.doesNotMatch(screen.text(), /Đang tải báo cáo/);
});

test('test_ST3_AC5_auxiliary_identity_errors: ca/chi nhánh lỗi giữ message+requestId, thử lại đúng phiên, danh sách phiên cũ không hiện', async () => {
  // ca: lỗi không bị coi là rỗng, không gọi báo cáo, thử lại nạp lại cả hai
  const cashier = mount({ permissions: ['report.view_shift'] });
  await cashier.flush();
  cashier.pending.current[0].reject(apiError('Máy chủ chưa tải được ca.', 'req-shift-1'));
  await cashier.flush();
  assert.match(alertText(cashier), /Máy chủ chưa tải được ca\./);
  assert.match(alertText(cashier), /req-shift-1/);
  assert.doesNotMatch(cashier.text(), /Chưa có ca thu ngân/);
  assert.equal(cashier.pending.reports.length, 0);
  await cashier.click('Tải lại ca');
  assert.equal(cashier.pending.current.length, 2);
  assert.equal(cashier.pending.shifts.length, 2);
  cashier.pending.current[1].resolve(null);
  cashier.pending.shifts[1].resolve(shiftPage([shift('s-new', { n: 3 })]));
  await cashier.flush();
  assert.equal(alertText(cashier), '');
  assert.equal(cashier.pending.reports[0].query.shiftId, 's-new');

  // ca: phản hồi phiên A đến sau khi đổi sang B không được hiện, cả thành công lẫn lỗi
  const first = mount({ permissions: ['report.view_shift'] });
  await first.flush();
  first.identity.identity = 'user-b'; first.identity.epoch++; first.session.user.id = 'user-b';
  first.touch(); await first.flush();
  assert.equal(first.pending.shifts.length, 2, 'request mới của phiên B đã tạo trong khi A còn pending');
  assert.deepEqual(plain(first.pending.shifts[1].query), { limit: 100, shiftType: 'CASHIER', userId: 'user-b' });
  first.pending.current[0].resolve(null);
  first.pending.shifts[0].resolve(shiftPage([shift('of-a', { n: 3 })]));
  await first.flush();
  assert.equal(first.pending.reports.length, 0, 'ca của A không kích hoạt báo cáo');
  assert.equal(optionValues(first, 'Ca thu ngân').length, 0);
  first.pending.current[1].resolve(null);
  first.pending.shifts[1].resolve(shiftPage([shift('of-b', { n: 3, userId: 'user-b' })]));
  await first.flush();
  assert.deepEqual(optionValues(first, 'Ca thu ngân'), ['of-b']);
  assert.equal(first.pending.reports[0].query.shiftId, 'of-b');

  // chi nhánh: lỗi giữ message/requestId, báo cáo vẫn dùng được, thử lại đúng phiên
  const owner = mount({ permissions: ['report.view_all', 'branch.access_all'], role: 'OWNER', branchId: null, userId: 'owner-a' });
  await owner.flush();
  owner.pending.branches[0].reject(apiError('Máy chủ chưa tải được chi nhánh.', 'req-branch-1'));
  await owner.flush();
  assert.match(alertText(owner), /Máy chủ chưa tải được chi nhánh\./);
  assert.match(alertText(owner), /req-branch-1/);
  assert.deepEqual(optionValues(owner, 'Chi nhánh'), ['']);
  await owner.click('Tải lại chi nhánh');
  assert.equal(owner.pending.branches.length, 2);
  owner.identity.identity = 'owner-b'; owner.identity.epoch++; owner.session.user.id = 'owner-b';
  owner.touch(); await owner.flush();
  assert.equal(owner.pending.branches.length, 3, 'phiên B có request riêng khi A còn pending');
  owner.pending.branches[1].resolve([{ id: 'branch-of-a', name: 'Chi nhánh phiên A' }]);
  await owner.flush();
  assert.deepEqual(optionValues(owner, 'Chi nhánh'), ['']);
  owner.pending.branches[0].reject(apiError('Lỗi phiên A.', 'req-old-branch'));
  await owner.flush();
  assert.equal(alertText(owner), '');
  owner.pending.branches[2].resolve([{ id: 'branch-of-b', name: 'Chi nhánh phiên B' }]);
  await owner.flush();
  assert.deepEqual(optionValues(owner, 'Chi nhánh'), ['', 'branch-of-b']);
});

test('test_ST3_AC6_pending_filter_identity: phản hồi A đến sau B hoặc sau đổi phiên/quyền không hiện ở bất kỳ render nào', async () => {
  const marker = 'VND:85000';
  // lọc mới: A pending thật, B đã tạo, rồi resolve/reject A
  const screen = mount({ permissions: ['report.view_branch'], role: 'MANAGER' });
  await screen.flush();
  const a = screen.pending.reports[0];
  await screen.change('Ngày báo cáo', '2026-11-13');
  assert.equal(screen.pending.reports.length, 2, 'request B đã tạo khi A còn pending');
  assert.equal(a.query.date, '2026-11-14');
  const mark = screen.snapshots.length;
  a.resolve(revenueFixture());
  await screen.flush();
  assert.ok(screen.snapshots.slice(mark).every(t => !t.includes(marker)), 'không render nào hiện báo cáo A');
  assert.equal(screen.find('DataTable'), undefined);
  assert.match(screen.text(), /Đang tải báo cáo/);
  await screen.change('Ngày báo cáo', '2026-11-12');
  const a2 = screen.pending.reports.at(-2);
  assert.equal(screen.pending.reports.length, 3);
  a2.reject(apiError('Lỗi của B cũ.', 'req-stale'));
  await screen.flush();
  assert.equal(alertText(screen), '');
  assert.ok(screen.snapshots.every(t => !t.includes('req-stale')));
  screen.pending.reports.at(-1).resolve({ ...revenueFixture(), date: '2026-11-12', totalRevenue: 1000 });
  await screen.flush();
  assert.ok(screen.text().includes('VND:1000'));

  // đổi phiên cùng người (epoch) và đổi người: render ngay trước effect không còn dữ liệu cũ
  const before = screen.snapshots.length;
  screen.identity.epoch++; screen.touch();
  screen.render();
  assert.ok(!screen.snapshots[before].includes('VND:1000'), 'render đầu tiên sau đổi epoch không giữ báo cáo cũ');
  await screen.flush();
  const reqA = screen.pending.reports.at(-1);
  screen.identity.identity = 'user-b'; screen.identity.epoch++; screen.session.user.id = 'user-b';
  screen.touch(); await screen.flush();
  assert.ok(screen.pending.reports.length >= 2);
  const requestsForB = screen.pending.reports.length;
  reqA.resolve(revenueFixture());
  await screen.flush();
  assert.ok(screen.snapshots.slice(before + 1).every(t => !t.includes(marker)));
  assert.equal(screen.pending.reports.length, requestsForB, 'resolve A không sinh request mới');

  // thu hồi quyền: chặn ngay, không gọi tiếp, A đến muộn không hiện
  const pendingA = screen.pending.reports.at(-1);
  const total = screen.pending.reports.length;
  screen.session.permissions = []; screen.touch();
  screen.render();
  assert.match(screen.snapshots.at(-1), /Không có quyền/);
  await screen.flush();
  pendingA.resolve(revenueFixture());
  await screen.flush();
  assert.equal(screen.pending.reports.length, total);
  assert.doesNotMatch(screen.text(), /VND:/);

  // đổi sang phạm vi ca của phiên B: chỉ đọc API scope B
  const cross = mount({ permissions: ['report.view_branch'], role: 'MANAGER' });
  await cross.flush();
  const oldRequest = cross.pending.reports[0];
  cross.identity.identity = 'cashier-b'; cross.identity.epoch++; cross.session.user.id = 'cashier-b';
  cross.session.user.role_code = 'CASHIER'; cross.session.permissions = ['report.view_shift'];
  cross.touch(); await cross.flush();
  assert.equal(cross.pending.reports.length, 1, 'chưa có ca của B thì chưa gọi báo cáo');
  assert.deepEqual(plain(cross.pending.shifts[0].query), { limit: 100, shiftType: 'CASHIER', userId: 'cashier-b' });
  oldRequest.resolve(revenueFixture());
  await cross.flush();
  assert.ok(!cross.text().includes(marker));
  cross.pending.current[0].resolve(null);
  cross.pending.shifts[0].resolve(shiftPage([shift('b-shift', { userId: 'cashier-b' })]));
  await cross.flush();
  assert.equal(cross.pending.reports.at(-1).query.shiftId, 'b-shift');

  // unmount: không cập nhật state
  const gone = mount({ permissions: ['report.view_shift'] });
  await gone.flush();
  const owner = mount({ permissions: ['report.view_all', 'branch.access_all'], role: 'OWNER', branchId: null });
  await owner.flush();
  gone.unmount(); owner.unmount();
  gone.pending.current[0].resolve(null); gone.pending.shifts[0].resolve(shiftPage([shift('x')]));
  owner.pending.branches[0].resolve([{ id: 'b', name: 'B' }]); owner.pending.reports[0].resolve(revenueFixture());
  await Promise.resolve(); await Promise.resolve();
  assert.equal(gone.updatesAfterUnmount + owner.updatesAfterUnmount, 0);
});

test('test_ST3_AC5_auxiliary_identity_errors load more: lỗi tải thêm ca giữ message/requestId, thử lại cùng cursor, unmount không setState', async () => {
  const screen = mount({ permissions: ['report.view_shift'] });
  await screen.flush();
  screen.pending.current[0].resolve(null);
  screen.pending.shifts[0].resolve(shiftPage([shift('s1', { n: 3 })], 'cursor-1'));
  await screen.flush();
  await screen.click('Tải thêm ca');
  screen.pending.shifts[1].reject(apiError('Máy chủ chưa tải thêm ca.', 'req-more-1'));
  await screen.flush();
  assert.match(alertText(screen), /Máy chủ chưa tải thêm ca\./);
  assert.match(alertText(screen), /req-more-1/);
  assert.deepEqual(optionValues(screen, 'Ca thu ngân'), ['s1'], 'giữ danh sách đã có');
  await screen.click('Tải thêm ca');
  assert.equal(screen.pending.shifts[2].query.cursor, 'cursor-1');
  assert.equal(alertText(screen), '', 'lỗi cũ biến mất khi thử lại');
  screen.unmount();
  const updates = screen.updatesAfterUnmount;
  screen.pending.shifts[2].resolve(shiftPage([shift('s2', { n: 2 })]));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(screen.updatesAfterUnmount, updates, 'phản hồi tải thêm sau unmount không cập nhật state');
});

test('[R1-1] test_ST3_AC2_shift_pages_current strict mode: Tải thêm ca vẫn gộp danh sách sau mount-cleanup-mount của StrictMode', async () => {
  const screen = mount({ strict: true, permissions: ['report.view_shift'] });
  await screen.flush();
  screen.pending.current.at(-1).resolve(null);
  screen.pending.shifts.at(-1).resolve(shiftPage([shift('s1', { n: 3 })], 'cursor-1'));
  await screen.flush();
  await screen.click('Tải thêm ca');
  screen.pending.shifts.at(-1).resolve(shiftPage([shift('s2', { n: 2 })]));
  await screen.flush();
  assert.deepEqual(optionValues(screen, 'Ca thu ngân'), ['s1', 's2'], 'danh sách ca phải gộp trang tải thêm');
});

const failingFetch = body => async () => Response.json(body, { status: 500 });
const realCleanup = () => { delete globalThis.document; delete globalThis.fetch; };

test('[V1-1] test_ST3_AC5_fallback_through_real_client: body lỗi thiếu message qua client thật vẫn hiện fallback báo cáo + requestId', async () => {
  globalThis.document = { cookie: '' };
  globalThis.fetch = failingFetch({ error: { code: 'INTERNAL_ERROR', requestId: 'req-reports-2' } });
  try {
    const screen = mount({ permissions: ['report.view_branch'], role: 'MANAGER', realClient: true });
    await screen.flush();
    for (let n = 0; n < 5; n++) await screen.flush();
    assert.ok(alertText(screen).includes(`${FALLBACK} (Mã yêu cầu: req-reports-2)`), alertText(screen));
    assert.doesNotMatch(alertText(screen), /Có lỗi xảy ra/);
  } finally { realCleanup(); }
});

test('[V1-1] test_ST3_AC5_message_from_server_kept_through_real_client: message của server không bị thay bằng fallback', async () => {
  globalThis.document = { cookie: '' };
  globalThis.fetch = failingFetch({ error: { code: 'INTERNAL_ERROR', message: 'Máy chủ chưa tải được báo cáo.', requestId: 'req-reports-3' } });
  try {
    const screen = mount({ permissions: ['report.view_branch'], role: 'MANAGER', realClient: true });
    for (let n = 0; n < 6; n++) await screen.flush();
    assert.ok(alertText(screen).includes('Máy chủ chưa tải được báo cáo. (Mã yêu cầu: req-reports-3)'), alertText(screen));
  } finally { realCleanup(); }
});

test('[V1-1] test_ST3_AC5_shift_list_fallback_through_real_client: danh sách ca thiếu message hiện fallback ca + requestId', async () => {
  globalThis.document = { cookie: '' };
  globalThis.fetch = failingFetch({ error: { code: 'INTERNAL_ERROR', requestId: 'req-shifts-1' } });
  try {
    const screen = mount({ permissions: ['report.view_shift'], role: 'CASHIER', realClient: true });
    screen.pending.current[0]?.resolve(null);
    for (let n = 0; n < 6; n++) await screen.flush();
    assert.ok(alertText(screen).includes('Không tải được danh sách ca. (Mã yêu cầu: req-shifts-1)'), alertText(screen));
  } finally { realCleanup(); }
});

test('[B-55] test_ST3_AC1_view_all_without_access_all_is_not_downgraded: view_all thiếu access_all không hạ xuống branch/shift, khớp server 403', async () => {
  for (const extra of [['report.view_branch'], ['report.view_shift'], ['report.view_branch', 'report.view_shift']]) {
    const permissions = ['report.view_all', ...extra];
    const screen = mount({ permissions, role: 'OWNER' });
    await screen.flush();
    const total = Object.values(screen.pending).reduce((sum, list) => sum + list.length, 0);
    assert.equal(total, 0, `${permissions} gọi API`);
    assert.match(screen.text(), /Không có quyền/);
  }
  // Có đủ access_all thì mức 'all' vẫn thắng quyền thấp hơn.
  const owner = mount({ permissions: ['report.view_all', 'branch.access_all', 'report.view_branch'], role: 'OWNER', branchId: null });
  await owner.flush();
  assert.equal(owner.pending.branches.length, 1);
  assert.ok(owner.field('Chi nhánh'));
});

test('[B-58] test_ST3_AC2_load_more_pending_disabled: Tải thêm ca disabled khi đang chờ, bấm đôi chỉ một request, mở lại sau khi xong hoặc lỗi', async () => {
  const history = Array.from({ length: 3 }, (_, i) => shift(`h${i + 1}`, { n: 1 }));
  const screen = mount({ permissions: ['report.view_shift'] });
  await screen.flush();
  screen.pending.current[0].resolve(null);
  screen.pending.shifts[0].resolve(shiftPage(history, 'cursor-1'));
  await screen.flush();
  const more = () => screen.find('button', p => screen.textOf(p.children).includes('Tải thêm ca'));
  assert.ok(!more().props.disabled, 'chưa chờ thì bật');
  await screen.click('Tải thêm ca');
  assert.equal(more().props.disabled, true, 'đang chờ thì disabled');
  more().props.onClick(); await screen.flush();
  assert.equal(screen.pending.shifts.length, 2, 'bấm đôi chỉ phát sinh một request');
  screen.pending.shifts[1].reject(apiError('Lỗi mạng.', 'req-more'));
  await screen.flush();
  assert.match(screen.text(), /Lỗi mạng/);
  assert.ok(!more().props.disabled, 'lỗi thì bật lại để thử');
  await screen.click('Tải thêm ca');
  assert.equal(screen.pending.shifts.length, 3);
  screen.pending.shifts[2].resolve(shiftPage([shift('h4', { n: 1 })], 'cursor-2'));
  await screen.flush();
  assert.ok(!more().props.disabled, 'xong còn cursor thì bật lại');
  assert.equal(optionValues(screen, 'Ca thu ngân').length, 4);
});
