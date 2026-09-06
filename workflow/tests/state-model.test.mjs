/**
 * harness.mjs 状态模型（registry 多槽）单元测试 — node:test
 *
 * 覆盖：旧单槽格式迁移、空对象兜底（回归 __default__ 幽灵槽 bug）、
 * current 修复、槽位合并/删除等纯函数。
 * 运行：pnpm -s run harness:test（= node --test workflow/tests/）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeState,
  getCurrentSlot,
  patchCurrent,
  patchSlot,
  removeSlotById,
  gateIcons,
  GATE_TEMPLATE,
} from '../../scripts/harness.mjs';

// ── normalizeState ──────────────────────────────────────

test('normalizeState: 旧单槽格式迁移为 registry', () => {
  const legacy = {
    taskType: 'full',
    gates: { P0: 'ts', P1: null, P2: null, P3: null, DONE: null },
    change: 'feat-aaa',
  };
  const out = normalizeState(legacy);
  assert.equal(out.current, 'feat-aaa');
  assert.deepEqual(Object.keys(out.slots), ['feat-aaa']);
  assert.equal(out.slots['feat-aaa'].taskType, 'full');
  assert.equal(out.slots['feat-aaa'].change, 'feat-aaa');
  assert.ok(out.slots['feat-aaa'].gates.P0);
});

test('normalizeState: 旧格式无 change/lastRunId 时归入 __default__', () => {
  const out = normalizeState({ taskType: 'full', gates: {} });
  assert.equal(out.current, '__default__');
});

test('normalizeState: 空对象 → 空 registry（不虚构槽位，回归幽灵槽 bug）', () => {
  for (const empty of [undefined, null, {}, { current: '', slots: {} }]) {
    const out = normalizeState(empty);
    assert.deepEqual(out, { current: '', slots: {} });
  }
});

test('normalizeState: 已是 registry 且 current 有效 → 原样', () => {
  const reg = {
    current: 'b',
    slots: { a: { taskType: 'auto-skip' }, b: { taskType: 'full' } },
  };
  const out = normalizeState(reg);
  assert.equal(out.current, 'b');
  assert.equal(Object.keys(out.slots).length, 2);
});

test('normalizeState: current 失效 → 修复为第一个槽', () => {
  const out = normalizeState({
    current: 'missing',
    slots: { x: { taskType: 'full' } },
  });
  assert.equal(out.current, 'x');
});

// ── getCurrentSlot ──────────────────────────────────────

test('getCurrentSlot: 返回 current 槽', () => {
  const reg = normalizeState({
    current: 'b',
    slots: { a: { taskType: 'auto-skip' }, b: { taskType: 'hotfix' } },
  });
  assert.equal(getCurrentSlot(reg).taskType, 'hotfix');
});

test('getCurrentSlot: 空 registry → null', () => {
  assert.equal(getCurrentSlot({ current: '', slots: {} }), null);
});

// ── patchCurrent ─────────────────────────────────────────

test('patchCurrent: 空 registry 不产生空名幽灵槽', () => {
  const out = patchCurrent({ current: '', slots: {} }, { lastRunId: 'x' });
  assert.deepEqual(out, { current: '', slots: {} });
});

// ── patchSlot ───────────────────────────────────────────

test('patchSlot: 激活已有槽并合并 patch', () => {
  const reg = normalizeState({
    current: 'a',
    slots: { a: { taskType: 'full', change: 'a' } },
  });
  const out = patchSlot(reg, 'b', { taskType: 'mandatory', change: 'b' });
  assert.equal(out.current, 'b');
  assert.equal(out.slots.b.taskType, 'mandatory');
  // 原槽不受影响
  assert.equal(out.slots.a.taskType, 'full');
});

// ── removeSlotById ──────────────────────────────────────

test('removeSlotById: 删除 current 槽 → current 落到剩余第一个', () => {
  const reg1 = normalizeState({
    current: 'b',
    slots: { a: { taskType: 'full' }, b: { taskType: 'full' } },
  });
  const out = removeSlotById(reg1, 'b');
  assert.equal(out.current, 'a');
  assert.equal(out.slots.b, undefined); // 被删槽已移除
  assert.ok(out.slots.a); // 保留槽未受影响
});

test('removeSlotById: 删除非 current 槽 → current 不变', () => {
  const reg = normalizeState({
    current: 'a',
    slots: { a: { taskType: 'full' }, b: { taskType: 'full' } },
  });
  const out = removeSlotById(reg, 'b');
  assert.equal(out.current, 'a');
  assert.deepEqual(Object.keys(out.slots), ['a']);
});

test('removeSlotById: 删空 registry → current 为空', () => {
  const reg = normalizeState({
    current: 'a',
    slots: { a: { taskType: 'auto-skip' } },
  });
  const out = removeSlotById(reg, 'a');
  assert.deepEqual(out, { current: '', slots: {} });
});

test('removeSlotById: 不突变入参', () => {
  const reg = normalizeState({
    current: 'a',
    slots: { a: { taskType: 'full' }, b: { taskType: 'full' } },
  });
  removeSlotById(reg, 'a');
  assert.ok(reg.slots.a); // 原对象仍含被删槽
});

// ── gateIcons / GATE_TEMPLATE ───────────────────────────

test('gateIcons: 有值 ✅ / 无值 ⬜', () => {
  assert.equal(
    gateIcons({ P0: 't', P1: null, P2: null, P3: null, DONE: null }),
    'P0:✅ P1:⬜ P2:⬜ P3:⬜ DONE:⬜',
  );
});

test('GATE_TEMPLATE: 五门全空', () => {
  assert.deepEqual(GATE_TEMPLATE, {
    P0: null,
    P1: null,
    P2: null,
    P3: null,
    DONE: null,
  });
});
