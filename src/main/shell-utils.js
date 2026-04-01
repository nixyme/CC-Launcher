'use strict';

const path = require('path');

/**
 * Returns the user's default shell path and corresponding RC file path.
 * Works on macOS, Linux, and Windows (falls back to cmd.exe on Windows).
 */
function getUserShellInfo() {
  if (process.platform === 'win32') {
    return { shell: 'cmd.exe', rcFile: '' };
  }
  const shell = process.env.SHELL || '/bin/zsh';
  const home = process.env.HOME || '';
  let rcFile = '';
  if (shell.endsWith('/zsh')) rcFile = path.join(home, '.zshrc');
  else if (shell.endsWith('/bash')) rcFile = path.join(home, '.bashrc');
  else if (shell.endsWith('/fish')) rcFile = path.join(home, '.config', 'fish', 'config.fish');
  return { shell, rcFile };
}

module.exports = { getUserShellInfo };
