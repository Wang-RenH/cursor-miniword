const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

async function main() {
  const build = path.join(__dirname, '..', 'build');
  const inputs = ['256', '128', '64', '48', '32', '16']
    .map((s) => path.join(build, `icon-${s}.png`))
    .filter((p) => fs.existsSync(p));
  if (!inputs.length) throw new Error('No icon-*.png in build/');
  const buf = await pngToIco(inputs);
  fs.writeFileSync(path.join(build, 'icon.ico'), buf);
  console.log('Wrote build/icon.ico', buf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
