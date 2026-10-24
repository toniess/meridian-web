// Файлы, которые pdf.js догружает сам: воркер, шрифты, таблицы кодировок,
// декодеры картинок. Берутся из установленного пакета, поэтому всегда той же
// версии, что и библиотека в бандле. Запускается перед dev и build.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = dirname(require.resolve('pdfjs-dist/package.json'));
const out = join(process.cwd(), 'public', 'pdfjs');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(pkg, 'legacy/build/pdf.worker.min.mjs'), join(out, 'pdf.worker.min.mjs'));
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(join(pkg, dir), join(out, dir), { recursive: true });
}
console.log('pdf.js assets → public/pdfjs');
