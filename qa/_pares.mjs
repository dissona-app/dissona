// Pares protótipo × app, lado a lado, na mesma viewport (1440×900).
// Uso: node qa/_pares.mjs <saida-dir> [filtro]
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const [OUT, filtro] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const contas = JSON.parse(readFileSync('qa/resultado/local-2/contas.json', 'utf8'));
const senhaE2E = process.env.E2E_SENHA;
const WEB = 'http://localhost:3000';
const ADM = 'http://admin.localhost:3001';
const e2e = (email) => ({ email, senha: senhaE2E });

const PARES = [
  [
    'artista-perfil',
    'Artista',
    { telaInicial: 'Perfil' },
    'artista',
    contas.artista,
    '/artista/perfil',
  ],
  [
    'artista-editar',
    'Artista',
    { telaInicial: 'Editar cadastro' },
    'artista',
    contas.artista,
    '/artista/perfil/editar',
  ],
  [
    'artista-carteira',
    'Artista',
    { telaInicial: 'Carteira' },
    'artista',
    contas.artista,
    '/artista/carteira',
  ],
  [
    'artista-enviar',
    'Artista',
    { telaInicial: 'Enviar' },
    'artista',
    contas.artista,
    '/artista/enviar',
  ],
  [
    'artista-conta',
    'Artista',
    { telaInicial: 'Configurações' },
    'artista',
    contas.artista,
    '/artista/conta',
  ],
  [
    'artista-preferencias',
    'Artista',
    { telaInicial: 'Configurações' },
    'artista',
    contas.artista,
    '/artista/conta?aba=preferencias',
    'Preferências',
  ],
  [
    'artista-seguranca',
    'Artista',
    { telaInicial: 'Configurações' },
    'artista',
    contas.artista,
    '/artista/conta?aba=seguranca',
    'Segurança',
  ],
  [
    'curador-fila',
    'Curador',
    { telaInicial: 'Fila' },
    'curador',
    e2e('e2e_bronze@e2e.dissona.local'),
    '/curador/fila',
  ],
  [
    'curador-meuperfil',
    'Curador',
    { telaInicial: 'Meu perfil' },
    'curador',
    e2e('e2e_manutencao@e2e.dissona.local'),
    '/curador/meu-cadastro',
  ],
  [
    'curador-conta',
    'Curador',
    { telaInicial: 'Conta e configurações' },
    'curador',
    contas.curador,
    '/curador/conta',
  ],
  [
    'artista-status',
    'Artista',
    { telaInicial: 'Status de envio' },
    'artista',
    contas.artista,
    '/artista/enviar/d5dd612f-9692-48ff-8665-ac2989fa6ad2/status',
  ],
  [
    'artista-vitrine-pacotes',
    'Artista',
    { telaInicial: 'Carteira' },
    'artista',
    contas.artista,
    '/artista/pacotes',
    ['Comprar Claves'],
  ],
  [
    'artista-extrato',
    'Artista',
    { telaInicial: 'Carteira' },
    'artista',
    contas.artista,
    '/artista/carteira/extrato',
    ['Ver extrato'],
  ],
  [
    'curador-detalhe',
    'Curador',
    { telaInicial: 'Fila' },
    'curador',
    e2e('e2e_bronze@e2e.dissona.local'),
    '/curador/fila/3c756d98-fc14-44e3-850a-31bea0c10add',
    ['texto:Fio de Prata'],
  ],
  [
    'curador-subjetiva',
    'Curador',
    { telaInicial: 'Avaliação' },
    'curador',
    e2e('e2e_bronze@e2e.dissona.local'),
    '/curador/avaliar/3c756d98-fc14-44e3-850a-31bea0c10add/subjetiva',
    ['Avançar', 'Confirmar e avançar'],
  ],
  [
    'curador-compartilhamento',
    'Curador',
    { telaInicial: 'Avaliação' },
    'curador',
    e2e('e2e_bronze@e2e.dissona.local'),
    '/curador/avaliar/3c756d98-fc14-44e3-850a-31bea0c10add/compartilhamento',
    ['Avançar', 'Confirmar e avançar', 'Avançar'],
  ],
  [
    'curador-remuneracao',
    'Curador',
    { telaInicial: 'Avaliação' },
    'curador',
    e2e('e2e_bronze@e2e.dissona.local'),
    '/curador/avaliar/3c756d98-fc14-44e3-850a-31bea0c10add/remuneracao',
    ['Avançar', 'Confirmar e avançar', 'Avançar', 'Avançar'],
  ],
  [
    'artista-pagamento',
    'Artista',
    { telaInicial: 'Carteira' },
    'artista',
    contas.artista,
    '/artista/pacotes/43ac883f-8d74-4f7f-be03-00604a697034',
    ['Comprar Claves', 'Escolher'],
  ],
  [
    'curador-notas-obj',
    'Curador',
    { telaInicial: 'Avaliação' },
    'curador',
    e2e('e2e_bronze@e2e.dissona.local'),
    '/curador/avaliar/3c756d98-fc14-44e3-850a-31bea0c10add/notas',
  ],
  [
    'curador-notas',
    'Curador',
    { telaInicial: 'Fila' },
    'curador',
    e2e('e2e_bronze@e2e.dissona.local'),
    '/curador/avaliar',
    ['Notas e feedback'],
  ],
  [
    'admin-novo',
    'Admin',
    { telaInicial: 'Pacotes de Claves' },
    'admin',
    contas.admin,
    '/pacotes/novo',
    ['Novo pacote'],
  ],
  [
    'admin-pacotes',
    'Admin',
    { telaInicial: 'Pacotes de Claves' },
    'admin',
    contas.admin,
    '/pacotes',
  ],
  ['admin-equipe', 'Admin', { telaInicial: 'Conta e equipe' }, 'admin', contas.admin, '/equipe'],
  [
    'artista-contexto',
    'Artista',
    { telaInicial: 'Enviar' },
    'artista',
    contas.artista,
    '/artista/enviar/6f9ced0b-58b6-4f66-afd7-a842fb37a428/contexto',
    [
      'preencher:https://open.spotify.com/track/...=https://open.spotify.com/track/abc',
      'Detectar faixa',
      'espera:2500',
      'Continuar',
    ],
  ],
  [
    'artista-curadores',
    'Artista',
    { telaInicial: 'Enviar' },
    'artista',
    contas.artista,
    '/artista/enviar/6f9ced0b-58b6-4f66-afd7-a842fb37a428/curadores',
    [
      'preencher:https://open.spotify.com/track/...=https://open.spotify.com/track/abc',
      'Detectar faixa',
      'espera:2500',
      'Continuar',
      'texto:Indie',
      'Continuar',
    ],
  ],
  [
    'artista-revisao',
    'Artista',
    { telaInicial: 'Enviar' },
    'artista',
    contas.artista,
    '/artista/enviar/6f9ced0b-58b6-4f66-afd7-a842fb37a428/revisao',
    [
      'preencher:https://open.spotify.com/track/...=https://open.spotify.com/track/abc',
      'Detectar faixa',
      'espera:2500',
      'Continuar',
      'texto:Indie',
      'Continuar',
      'css::is(button,label,[role=checkbox]):has-text("Feedback")',
      'espera:500',
      'Continuar para revisão',
    ],
  ],
  ['auth-login-artista', 'Artista', { telaInicial: 'Login' }, 'artista', null, '/artista/entrar'],
  ['auth-login-curador', 'Curador', { telaInicial: 'Login' }, 'curador', null, '/curador/entrar'],
  [
    'auth-cadastro-artista',
    'Artista',
    { telaInicial: 'Cadastro' },
    'artista',
    null,
    '/artista/cadastrar',
  ],
  [
    'auth-cadastro-curador',
    'Curador',
    { telaInicial: 'Cadastro' },
    'curador',
    null,
    '/curador/cadastrar',
  ],
  [
    'auth-recuperacao',
    'Artista',
    { telaInicial: 'Recuperação' },
    'artista',
    null,
    '/recuperar-senha',
  ],
  [
    'auth-redefinicao',
    'Artista',
    { telaInicial: 'Redefinição' },
    'artista',
    null,
    '/redefinir-senha',
  ],
  [
    'auth-onboarding',
    'Artista',
    { telaInicial: 'Onboarding' },
    'artista',
    contas.artista,
    '/onboarding',
  ],
  [
    'curador-analise',
    'Curador',
    { telaInicial: 'Cadastro em análise' },
    'curador',
    contas.curador,
    '/curador/cadastro/analise',
  ],
  [
    'curador-classificacao',
    'Curador',
    { telaInicial: 'Classificação' },
    'curador',
    contas.curador,
    '/curador/cadastro/classificacao',
  ],
  [
    'curador-bronze',
    'Curador',
    { telaInicial: 'Boas-vindas Bronze' },
    'curador',
    contas.curador,
    '/curador/cadastro/bronze',
  ],
];

const b = await chromium.launch();
const sessoes = new Map();
async function paginaDoApp(papel, conta) {
  if (conta === null) {
    // Telas públicas: um contexto limpo, sem sessão.
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    return { p: await ctx.newPage(), base: papel === 'admin' ? ADM : WEB };
  }
  const chave = papel + conta.email;
  if (sessoes.has(chave)) return sessoes.get(chave);
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const base = papel === 'admin' ? ADM : WEB;
  await p.goto(base + (papel === 'admin' ? '/entrar' : `/${papel}/entrar`));
  await p.getByLabel('E-mail', { exact: true }).fill(conta.email);
  await p.getByLabel('Senha', { exact: true }).fill(conta.senha);
  await p.getByRole('button', { name: /^Entrar$/ }).click();
  await p.waitForURL((u) => !u.pathname.endsWith('/entrar'), { timeout: 30000 }).catch(() => {});
  const r = { p, base };
  sessoes.set(chave, r);
  return r;
}

const proto = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [nome, amb, props, papel, conta, rota, clique] of PARES) {
  if (filtro && !nome.includes(filtro)) continue;
  await proto.goto(
    pathToFileURL(join(process.cwd(), 'docs/prototipo-aprovado', `${amb}.html`)).href,
  );
  await proto.locator('h1').first().waitFor();
  await proto.evaluate((v) => window.__dcSetProps(Object.keys(window.__dcRegistry)[0], v), props);
  await proto.waitForTimeout(1000);
  for (const passo of clique === undefined ? [] : Array.isArray(clique) ? clique : [clique]) {
    if (passo.startsWith('preencher:')) {
      const [ph, valor] = passo.slice(10).split('=');
      await proto.getByPlaceholder(ph).first().fill(valor);
    } else if (passo.startsWith('css:')) {
      await proto.locator(passo.slice(4)).first().click({ force: true });
    } else if (passo.startsWith('espera:')) {
      await proto.waitForTimeout(Number(passo.slice(7)));
    } else if (passo.startsWith('texto:')) {
      await proto.getByText(passo.slice(6), { exact: true }).first().click();
    } else {
      await proto.getByRole('button', { name: passo, exact: true }).first().click();
    }
    await proto.waitForTimeout(900);
  }
  await proto.mouse.move(2, 2);
  const a = await proto.screenshot();
  const { p, base } = await paginaDoApp(papel, conta);
  await p.goto(base + rota, { timeout: 60000 });
  await p.waitForTimeout(1800);
  await p.mouse.move(2, 2);
  const c = await p.screenshot();
  const comp = await b.newPage({ viewport: { width: 2900, height: 930 } });
  await comp.setContent(`<body style="margin:0;background:#888;display:flex;gap:20px;font:14px sans-serif">
    <div><div style="height:30px">PROTÓTIPO · ${nome}</div><img src="data:image/png;base64,${a.toString('base64')}"></div>
    <div><div style="height:30px">APP · ${rota}</div><img src="data:image/png;base64,${c.toString('base64')}"></div></body>`);
  await comp.screenshot({ path: `${OUT}/${nome}.png` });
  await comp.close();
  console.log('ok', nome);
}
await b.close();
