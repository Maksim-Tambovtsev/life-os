const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (major !== 24 || minor < 22 || (minor === 22 && patch < 1)) {
  throw new Error('Life OS: use Node 24.22.1 from .nvmrc (nvm install && nvm use).');
}
