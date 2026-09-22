// Lightweight ANSI color helpers for terminal output (Zero dependencies)
const isColorSupported = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.FORCE_COLOR);

function color(open, close) {
  return (str) => (isColorSupported ? `\x1b[${open}m${str}\x1b[${close}m` : String(str));
}

module.exports = {
  reset: color(0, 0),
  bold: color(1, 22),
  dim: color(2, 22),
  italic: color(3, 23),
  underline: color(4, 24),
  red: color(31, 39),
  green: color(32, 39),
  yellow: color(33, 39),
  blue: color(34, 39),
  magenta: color(35, 39),
  cyan: color(36, 39),
  white: color(37, 39),
  gray: color(90, 39),
  bgRed: color(41, 49),
  bgGreen: color(42, 49),
  bgYellow: color(43, 49)
};
