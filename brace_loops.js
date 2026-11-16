// p5-editor preflight: report and fix loops that are not the direct child of a block (loop-protect trap).
const acorn = require('acorn'), walk = require('acorn-walk'), fs = require('fs');
const file = process.argv[2];
const L = ['ForStatement', 'WhileStatement', 'DoWhileStatement', 'ForOfStatement', 'ForInStatement'];
function find(src) {
  const ast = acorn.parse(src, { ecmaVersion: 2022, locations: true }), bad = [];
  walk.fullAncestor(ast, (node, _, a) => {
    if (!L.includes(node.type)) { return; }
    const p = a[a.length - 2];
    if (p && !['BlockStatement', 'Program', 'StaticBlock', 'SwitchCase'].includes(p.type)) { bad.push(node); }
  });
  return bad;
}
let src = fs.readFileSync(file, 'utf8'), bad = find(src), fixed = 0;
while (bad.length) {
  const ins = [];
  for (const n of bad) { ins.push([n.start, '{ '], [n.end, ' }']); }
  ins.sort((x, y) => y[0] - x[0]);
  for (const [pos, s] of ins) { src = src.slice(0, pos) + s + src.slice(pos); }
  fixed += bad.length; bad = find(src);
  if (fixed > 500) { break; }
}
fs.writeFileSync(file, src);
console.log('preflight: braced ' + fixed + ' loop(s); unbraced remaining: ' + find(src).length);
