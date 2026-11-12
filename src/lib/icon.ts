import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'node_modules/lucide-static/icons');

/** 線画アイコンを SVG の文字列で返す。名前が無い・ファイルが無いときは空文字 */
export const iconSvg = (name?: string) => {
  const path = name ? resolve(dir, `${name}.svg`) : '';
  return path && existsSync(path) ? readFileSync(path, 'utf8').replace(/<!--[\s\S]*?-->/g, '') : '';
};
