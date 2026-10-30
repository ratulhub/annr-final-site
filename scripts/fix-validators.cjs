const fs = require('fs');

for (const file of [
  '.agents/skills/security-audit/validate-findings.cjs',
  '.agents/skills/security-audit/validate-coverage-ledger.cjs'
]) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /function readFileWithinLimit\(file\) \{[\s\S]*?try \{\s*descriptor = fs\.openSync\(file, fs\.constants\.O_RDONLY \| noFollow \| nonBlock\);/,
    `function readFileWithinLimit(file) {
  const isWindows = process.platform === "win32";
  const noFollow = fs.constants.O_NOFOLLOW || 0;
  const nonBlock = fs.constants.O_NONBLOCK || 0;
  if (!isWindows && (!Number.isInteger(noFollow) || noFollow === 0 || !Number.isInteger(nonBlock) || nonBlock === 0)) {
    throw new SafeInputError("OS no-follow and nonblocking input protection is unavailable");
  }

  let descriptor;
  try {
    if (isWindows) {
      try {
        const lstat = fs.lstatSync(file);
        if (lstat.isSymbolicLink()) throw new SafeInputError("input must not be a symlink");
      } catch (err) {
        if (err instanceof SafeInputError) throw err;
      }
      descriptor = fs.openSync(file, fs.constants.O_RDONLY);
    } else {
      descriptor = fs.openSync(file, fs.constants.O_RDONLY | noFollow | nonBlock);
    }`
  );
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Updated validators for cross-platform support');
