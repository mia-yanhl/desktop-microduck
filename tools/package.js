// Packages app/ into Desktop Microduck.app for Apple Silicon and Intel Macs (run on any OS).
const { packager } = require('@electron/packager');
const path = require('path');
(async () => {
  const out = await packager({
    dir: path.join(__dirname, '..', 'app'), out: path.join(__dirname, '..', 'dist'), overwrite: true,
    platform: 'darwin', arch: ['arm64', 'x64'], electronVersion: '45.0.0',
    name: 'Desktop Microduck', appBundleId: 'io.github.desktop-microduck', appCategoryType: 'public.app-category.entertainment',
    icon: path.join(__dirname, '..', 'build-icon.icns'), asar: true, appVersion: '0.1.0', appCopyright: 'MIT licence',
    extendInfo: { LSUIElement: true },        // a menu bar app: no Dock icon, no app menu
    ignore: [/icon\.png$/],
  });
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
