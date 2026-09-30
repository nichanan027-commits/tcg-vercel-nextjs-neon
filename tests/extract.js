'use strict';
// Loads the pure R2O core out of index.html so it can be unit-tested in Node.
// The core is delimited in the source by /* R2O_CORE_START */ ... /* R2O_CORE_END */.
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'index.html');

function source() {
  return fs.readFileSync(INDEX, 'utf8');
}

function coreSource() {
  const src = source();
  const a = src.indexOf('/* R2O_CORE_START */');
  const b = src.indexOf('/* R2O_CORE_END */');
  if (a < 0 || b < 0) throw new Error('core markers not found in index.html');
  return src.slice(a, b);
}

function loadCore() {
  // eslint-disable-next-line no-new-func
  new Function(coreSource())();
  return globalThis.R2O;
}

function scriptSource() {
  const src = source();
  const m = /<script>([\s\S]*)<\/script>/.exec(src);
  if (!m) throw new Error('inline script not found in index.html');
  return m[1];
}

module.exports = { INDEX, source, coreSource, loadCore, scriptSource };
