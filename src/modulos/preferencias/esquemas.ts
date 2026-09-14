import { z } from 'zod';

import { IDIOMAS } from './tipos';

/** Validação das duas mutações de 7.3 / 17.3. As mensagens são códigos. */

export const esquemaAlternarCanal = z.object({
  evento: z.string().trim().min(1, { message: 'evento_vazio' }),
  canal: z.enum(['in_app', 'email'], { message: 'canal_desconhecido' }),
  ligado: z.boolean(),
});

export const esquemaIdioma = z.object({
  idioma: z.enum(IDIOMAS as readonly [string, ...string[]], { message: 'idioma_desconhecido' }),
});
