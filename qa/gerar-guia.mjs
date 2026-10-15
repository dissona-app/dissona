// Gera qa/resultado/guia-apresentacao.html (gitignored) a partir de
// qa/resultado/usuarios.md — as senhas saem do arquivo, nunca do código.
import { readFileSync, writeFileSync } from 'node:fs';

const WEB = 'https://dissona.com.br';
const PAINEL = 'https://painel.dissona.com.br';

const linhas = readFileSync('qa/resultado/usuarios.md', 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('|') && l.includes('@'))
  .map((l) => l.split('|').map((c) => c.trim().replace(/^`|`$/g, '')));

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const entrada = (perfil) =>
  /admin/i.test(perfil)
    ? `${PAINEL}/entrar`
    : /curador/i.test(perfil)
      ? `${WEB}/curador/entrar`
      : `${WEB}/artista/entrar`;

const contas = linhas
  .map(
    ([, perfil, email, senha]) => `<tr>
      <td><strong>${esc(perfil)}</strong></td>
      <td><code>${esc(email)}</code></td>
      <td><code>${esc(senha)}</code></td>
      <td><a href="${entrada(perfil)}">${entrada(perfil).replace('https://', '')}</a></td>
    </tr>`,
  )
  .join('\n');

const html = readFileSync('qa/guia-apresentacao.modelo.html', 'utf8')
  .replaceAll('{{CONTAS}}', contas)
  .replaceAll('{{WEB}}', WEB)
  .replaceAll('{{PAINEL}}', PAINEL);

writeFileSync('qa/resultado/guia-apresentacao.html', html);
console.log(`guia gerado com ${linhas.length} contas`);
