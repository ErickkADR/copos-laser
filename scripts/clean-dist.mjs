// Exemplos locais (arte com direitos autorais) nunca vão para o deploy: public/locais é copiado pelo Vite e removido daqui.
import { rm } from 'node:fs/promises';
await rm(new URL('../dist/locais', import.meta.url), { recursive: true, force: true });
console.log('dist/locais removido (exemplos locais ficam fora do deploy)');
