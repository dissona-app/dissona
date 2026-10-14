import f1 from '@dissona/nucleo/componentes/autenticacao/capas/f1.png';
import f2 from '@dissona/nucleo/componentes/autenticacao/capas/f2.png';
import f3 from '@dissona/nucleo/componentes/autenticacao/capas/f3.png';
import f4 from '@dissona/nucleo/componentes/autenticacao/capas/f4.png';
import f5 from '@dissona/nucleo/componentes/autenticacao/capas/f5.png';

const CAPAS = [f1.src, f2.src, f3.src, f4.src, f5.src];

/**
 * A capa de um envio enquanto a faixa não tem capa própria no banco: um dos
 * cinco discos do protótipo aprovado, escolhido pelo id — estável entre telas
 * (a Fila e o detalhe mostram a mesma).
 */
export function capaDoEnvio(envioId: string): string {
  const numero = Number.parseInt(envioId.replace(/-/g, '').slice(-8), 16);
  return CAPAS[(Number.isNaN(numero) ? 0 : numero) % CAPAS.length] ?? f1.src;
}
