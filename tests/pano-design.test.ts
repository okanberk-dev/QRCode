import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitPanoNumber } from '../src/components/panel/pano/PanoNumber';
import { toSentenceCase } from '../src/components/panel/pano/sentence-case';

test('PanoNumber splits the fraction with the locale separator', () => {
  assert.deepEqual(splitPanoNumber('6.010,29', 'tr'), { prefix: '', whole: '6.010', fraction: ',29', suffix: '' });
  assert.deepEqual(splitPanoNumber('4.6★', 'en'), { prefix: '', whole: '4', fraction: '.6', suffix: '★' });
  assert.deepEqual(splitPanoNumber('%62', 'tr'), { prefix: '%', whole: '62', fraction: '', suffix: '' });
  assert.deepEqual(splitPanoNumber('₺1.234,5', 'tr'), { prefix: '₺', whole: '1.234', fraction: ',5', suffix: '' });
  // A Turkish thousands group is not a fraction.
  assert.deepEqual(splitPanoNumber('1.234', 'tr'), { prefix: '', whole: '1.234', fraction: '', suffix: '' });
  assert.deepEqual(splitPanoNumber('12 dk', 'tr'), { prefix: '', whole: '12', fraction: '', suffix: ' dk' });
  assert.equal(splitPanoNumber('—', 'tr'), null);
});

test('toSentenceCase turns all-caps labels into Turkish sentence case', () => {
  assert.equal(toSentenceCase('MENÜ YAYIN AKIŞI'), 'Menü yayın akışı');
  assert.equal(toSentenceCase('İŞLETME BÜYÜMESİ'), 'İşletme büyümesi');
  assert.equal(toSentenceCase('PULSE AI ÇIKARIMI'), 'Pulse AI çıkarımı');
  assert.equal(toSentenceCase('SUPERADMIN · DENETİM MERKEZİ'), 'Superadmin · denetim merkezi');
  assert.equal(toSentenceCase('Zaten düzgün'), 'Zaten düzgün');
  assert.equal(toSentenceCase('KVKK & YASAL'), 'KVKK & yasal');
});
