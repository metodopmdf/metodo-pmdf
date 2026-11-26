import {mkdir, rm, readdir, copyFile, cp, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
const output = path.join(root,'dist');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await copyFile(path.join(root,'index.html'),path.join(output,'index.html'));
async function copyAssets(relative) {
  for (const item of await readdir(path.join(root,relative),{withFileTypes:true})) {
    const file = path.join(relative,item.name);
    if (item.isDirectory()) { await copyAssets(file); continue; }
    if (!item.isFile() || (!/\.(?:js|css|svg|png|jpe?g|webp|ico|woff2?)$/.test(file) && file !== sample))
      throw new Error('Arquivo não permitido na publicação: '+file);
    await mkdir(path.dirname(path.join(output,file)),{recursive:true});
    await copyFile(path.join(root,file),path.join(output,file));
  }
}
const sample = path.join('assets', 'bancos', 'amostra-anki.json');
const data = JSON.parse(await readFile(path.join(root,sample),'utf8'));
if (data.cards?.length !== 52 || new Set(data.cards.map(c => c.disciplina)).size !== 22 ||
    new Set(data.cards.map(c => c.id)).size !== 52) throw new Error('Apenas a amostra validada pode ser publicada.');
await copyAssets('assets');
const readers = path.join(output, 'assets', 'readers');
const pdfRoot = path.join(root, 'node_modules', 'pdfjs-dist');
const docxRoot = path.join(root, 'node_modules', 'mammoth');
await mkdir(readers, {recursive: true});
for (const file of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  await copyFile(path.join(pdfRoot, 'legacy', 'build', file), path.join(readers, file));
}
await copyFile(path.join(pdfRoot, 'LICENSE'), path.join(readers, 'PDFJS-LICENSE'));
for (const resource of ['cmaps', 'standard_fonts']) {
  await cp(path.join(pdfRoot, resource), path.join(readers, resource), {recursive: true});
}
await copyFile(path.join(docxRoot, 'mammoth.browser.min.js'), path.join(readers, 'mammoth.browser.min.js'));
await copyFile(path.join(docxRoot, 'LICENSE'), path.join(readers, 'MAMMOTH-LICENSE'));

console.log('Publicação estática preparada em dist/; 52 cartões na amostra; acervo completo, backend e testes excluídos.');
