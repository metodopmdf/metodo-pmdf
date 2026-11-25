import {mkdir, rm, readdir, copyFile} from 'node:fs/promises';
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
    if (!/\.(?:js|css|svg|png|jpe?g|webp|ico|woff2?)$/.test(file) && item.name !== 'SUPABASE-LICENSE')
      throw new Error('Arquivo não permitido na publicação: '+file);
    await mkdir(path.dirname(path.join(output,file)),{recursive:true});
    await copyFile(path.join(root,file),path.join(output,file));
  }
}
await copyAssets('assets');
console.log('Publicação estática preparada em dist/; acervo, backend e testes não são publicados.');
