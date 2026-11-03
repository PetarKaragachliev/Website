import { realpathSync } from 'node:fs';
import { isAbsolute, relative, sep } from 'node:path';

const directory = realpathSync(process.cwd());
const roots = Object.entries(process.env).filter(([name, value]) => /^onedrive(?:consumer|commercial)?$/i.test(name) && value).map(([, value]) => value);
const insideSyncRoot = roots.some(root => {
  let resolvedRoot = root;
  try {
    resolvedRoot = realpathSync(root);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Cannot verify the configured OneDrive root. Resolve its access error before running development tools.');
      process.exit(1);
    }
  }
  const location = relative(resolvedRoot, directory);
  return location === '' || (location !== '..' && !location.startsWith(`..${sep}`) && !isAbsolute(location));
});
if (insideSyncRoot || /(?:^|[\\/])OneDrive(?: - [^\\/]+)?(?:[\\/]|$)/i.test(directory)) {
  console.error('Refusing to run development/test tools inside OneDrive. Use the active checkout outside OneDrive; do not generate dependencies or Git/test artifacts in the old synced folder.');
  process.exitCode = 1;
}
