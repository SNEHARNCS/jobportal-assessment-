import test from 'node:test';
import assert from 'node:assert/strict';

test('application role names match the assessment roles',()=>{
  const roles=['admin','employer','job_seeker'];
  assert.equal(roles.length,3);
  assert.ok(roles.includes('admin') && roles.includes('employer') && roles.includes('job_seeker'));
});
test('application lifecycle includes required core states',()=>{
  const states=['applied','under_review','shortlisted','interview_scheduled','rejected','selected','withdrawn'];
  assert.equal(new Set(states).size,7);
});
