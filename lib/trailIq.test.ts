import assert from 'node:assert/strict';
import { test } from 'node:test';

import { answerStreak, dayNumber, questionForDay, rightCount, shuffledAnswers, TRAIL_QUESTIONS } from './trailIq.ts';

test('every question has a unique id, three distinct answers and a why', () => {
  const ids = new Set(TRAIL_QUESTIONS.map((q) => q.id));
  assert.equal(ids.size, TRAIL_QUESTIONS.length);
  for (const q of TRAIL_QUESTIONS) {
    assert.equal(new Set(q.answers).size, 3, q.id);
    assert.ok(q.why.length > 10, q.id);
    assert.ok(q.question.length <= 110, `${q.id} question is long`);
  }
});

test('one cycle of days shows every question exactly once', () => {
  const seen = new Set<string>();
  for (let day = 0; day < TRAIL_QUESTIONS.length; day += 1) seen.add(questionForDay(day).id);
  assert.equal(seen.size, TRAIL_QUESTIONS.length);
  assert.equal(questionForDay(5).id, questionForDay(5 + TRAIL_QUESTIONS.length).id);
  assert.ok(questionForDay(-3));
});

test('the shuffle keeps all three answers and points at the right one', () => {
  for (let day = 0; day < 60; day += 1) {
    const q = questionForDay(day);
    const { answers, correct } = shuffledAnswers(q, day);
    assert.deepEqual([...answers].sort(), [...q.answers].sort());
    assert.equal(answers[correct], q.answers[0]);
  }
  const slots = new Set(Array.from({ length: 30 }, (_, d) => shuffledAnswers(questionForDay(d), d).correct));
  assert.equal(slots.size, 3, 'the right answer is not always in the same place');
});

test('days count from local midnight', () => {
  assert.equal(dayNumber(new Date(2024, 0, 1, 23, 59)), 0);
  assert.equal(dayNumber(new Date(2024, 0, 2, 0, 1)), 1);
});

test('the streak counts days answered in a row, through yesterday', () => {
  const state = { picks: { '10': 0, '11': 2, '12': 1 }, right: { '10': true, '11': false, '12': true } };
  assert.equal(answerStreak(state, 12), 3);
  assert.equal(answerStreak(state, 13), 3);
  assert.equal(answerStreak(state, 14), 0);
  assert.equal(rightCount(state), 2);
});
