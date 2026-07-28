const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const backendRoot = path.resolve(__dirname, '..');
const envFileName = '.env.dev';
const envFilePath = path.join(backendRoot, envFileName);

function parseEnvFile(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

if (!fs.existsSync(envFilePath)) {
  console.error(`Development env dosyası bulunamadı: ${envFilePath}`);
  process.exit(1);
}

const envValues = parseEnvFile(fs.readFileSync(envFilePath, 'utf8'));

process.env.NODE_ENV = 'development';
process.env.ENV_FILE = envFileName;

for (const [key, value] of Object.entries(envValues)) {
  process.env[key] = value;
}

process.env.PORT = envValues.PORT || '8101';

const nestCli = path.join(
  backendRoot,
  'node_modules',
  '@nestjs',
  'cli',
  'bin',
  'nest.js',
);

const child = spawn(process.execPath, [nestCli, 'start', '--watch'], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
