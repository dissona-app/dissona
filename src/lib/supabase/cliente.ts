'use client';

/**
 * Cliente Supabase do navegador.
 *
 * Usa a chave publishable e respeita a RLS — é o único caminho de acesso do
 * browser. Toda mutação sensível passa por Server Action, não por aqui
 * (architecture.md §4).
 */

import { createBrowserClient } from '@supabase/ssr';

import { ambiente } from '../ambiente';
import type { Database } from './tipos-bd';

export function criarClienteNavegador() {
  return createBrowserClient<Database>(ambiente.supabase.url, ambiente.supabase.chavePublica);
}

export type ClienteNavegador = ReturnType<typeof criarClienteNavegador>;
