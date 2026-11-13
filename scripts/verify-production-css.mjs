// Assert on the shipped CSS, rather than source imports which can exist without compiling.
import { readdir, readFile } from 'node:fs/promises';
const directory = new URL('../.next/static/css/', import.meta.url);
const files = (await readdir(directory)).filter((name) => name.endsWith('.css'));
const css = (await Promise.all(files.map((name) => readFile(new URL(name, directory), 'utf8')))).join('\n');
const required = ['.sr-only{', '.md\\:block{', '.md\\:flex{', '.flex{', '.fixed{'];
const missing = required.filter((selector) => !css.includes(selector));
if (missing.length || /@theme\b|@custom-variant\b/.test(css)) {
  throw new Error(`Tailwind no se compiló correctamente para producción. Faltan: ${missing.join(', ')}`);
}
console.log('Production CSS verified: desktop sidebar, flex layout and screen-reader utilities.');
