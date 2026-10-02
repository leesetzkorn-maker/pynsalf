import { stdin, stdout } from 'node:process';
import { randomBytes, pbkdf2Sync } from 'node:crypto';

const iterations = 100_000;
function readHiddenPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal so the password is not echoed.');
  }
  return new Promise((resolve, reject) => {
    let password = '';
    stdout.write('Enter a new admin password (minimum 16 characters): ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const finish = (err) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      if (err) reject(err);
      else resolve(password);
    };
    const onData = (key) => {
      if (key === '\u0003') return finish(new Error('Cancelled.'));
      if (key === '\r' || key === '\n') return finish();
      if (key === '\u007f' || key === '\b') {
        if (password.length) {
          password = password.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }
      if (key >= ' ' && password.length < 1024) {
        password += key;
        stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

const password = await readHiddenPassword();
if (password.length < 16) throw new Error('Password must be at least 16 characters.');
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
console.log(`Password hash (store only as a Worker secret):\npbkdf2$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`);
