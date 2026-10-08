const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const reference = require('./fixtures/phase5-reviewed-v36-reference.json');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

test('reviewed v36 reference has explicit provenance and exactly the approved function set', () => {
  assert.equal(reference.version, 36);
  assert.equal(reference.historicalPin, '7ce47eafc796e5215e9a69d2faca130ae922d680');
  assert.equal(reference.provenance.bundleSHA256, 'd9d55506eb2692abb4a20fe59e72c123ca433fdef948e888f85851bab790d158');
  assert.deepEqual(reference.functions.map(item => item.name), [
    'bookingOccupiedDate', 'bookingMatchesTargetScope', 'calculateAvailability',
    'bookingAvailabilityPhase5StaffNameKey', 'bookingAvailabilityPhase5BookingScopeError',
    'bookingAvailabilityPhase5BookingOccupiedDate', 'bookingAvailabilityPhase5ScopedBookings',
    'bookingAvailabilityPhase5Evaluate'
  ]);
});

for (const item of reference.functions) test(`current reviewed function equals immutable reference: ${item.name}`, () => {
  assert.equal(hash(item.source), item.sha256, 'reference integrity');
  const source = fs.readFileSync(path.join(__dirname, '..', item.file), 'utf8').replace(/\r\n/g, '\n');
  const match = new RegExp('^([ ]*)function ' + item.name + '\\(', 'm').exec(source);
  assert.ok(match, 'named function exists');
  const end = source.indexOf('\n' + match[1] + '}', match.index);
  assert.ok(end > match.index, 'complete function boundary');
  assert.equal(source.slice(match.index, end + match[1].length + 2), item.source);
});
