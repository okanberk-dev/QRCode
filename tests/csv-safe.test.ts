/**
 * CSV formula-injection guard tests.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { csvCell, neutralizeCsvFormula } from '../src/lib/csv-safe';

describe('neutralizeCsvFormula', () => {
  it('prefixes formula triggers', () => {
    assert.equal(neutralizeCsvFormula('=1+1'), "'=1+1");
    assert.equal(neutralizeCsvFormula('+cmd|calc'), "'+cmd|calc");
    assert.equal(neutralizeCsvFormula('-2+3+cmd'), "'-2+3+cmd");
    assert.equal(neutralizeCsvFormula('@SUM(A1)'), "'@SUM(A1)");
    assert.equal(neutralizeCsvFormula('\t=x'), "'\t=x");
    assert.equal(neutralizeCsvFormula('\r=x'), "'\r=x");
    assert.equal(
      neutralizeCsvFormula('=HYPERLINK("http://evil","x")'),
      `'=HYPERLINK("http://evil","x")`,
    );
  });

  it('leaves numeric strings and the "-" placeholder alone', () => {
    assert.equal(neutralizeCsvFormula('-3'), '-3');
    assert.equal(neutralizeCsvFormula('-0.5'), '-0.5');
    assert.equal(neutralizeCsvFormula('+1.25'), '+1.25');
    assert.equal(neutralizeCsvFormula('-'), '-');
  });

  it('leaves normal text alone', () => {
    assert.equal(neutralizeCsvFormula('Harika servis'), 'Harika servis');
    assert.equal(neutralizeCsvFormula('a=b'), 'a=b');
    assert.equal(neutralizeCsvFormula(''), '');
  });
});

describe('csvCell', () => {
  it('quotes and doubles inner quotes like the old helpers', () => {
    assert.equal(csvCell('Ali "Usta"'), '"Ali ""Usta"""');
    assert.equal(csvCell('a,b'), '"a,b"');
  });

  it('renders null / undefined as an empty quoted cell', () => {
    assert.equal(csvCell(null), '""');
    assert.equal(csvCell(undefined), '""');
  });

  it('never prefixes real numbers', () => {
    assert.equal(csvCell(-3), '"-3"');
    assert.equal(csvCell(4.5), '"4.5"');
  });

  it('neutralizes formula strings inside the quotes', () => {
    assert.equal(csvCell('=1+1'), `"'=1+1"`);
    assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  });
});
