export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      avaliacao: {
        Row: {
          atualizado_em: string
          classe_no_momento:
            | Database["public"]["Enums"]["classe_curador"]
            | null
          concluida_em: string | null
          criado_em: string
          envio_id: string
          escuta_percentual: number
          feedback: string | null
          id: string
          no_prazo: boolean | null
          nota_subjetiva: number | null
          passo_atual: number
          perfil_curador_id: string
          situacao: Database["public"]["Enums"]["situacao_avaliacao"]
        }
        Insert: {
          atualizado_em?: string
          classe_no_momento?:
            | Database["public"]["Enums"]["classe_curador"]
            | null
          concluida_em?: string | null
          criado_em?: string
          envio_id: string
          escuta_percentual?: number
          feedback?: string | null
          id?: string
          no_prazo?: boolean | null
          nota_subjetiva?: number | null
          passo_atual?: number
          perfil_curador_id: string
          situacao?: Database["public"]["Enums"]["situacao_avaliacao"]
        }
        Update: {
          atualizado_em?: string
          classe_no_momento?:
            | Database["public"]["Enums"]["classe_curador"]
            | null
          concluida_em?: string | null
          criado_em?: string
          envio_id?: string
          escuta_percentual?: number
          feedback?: string | null
          id?: string
          no_prazo?: boolean | null
          nota_subjetiva?: number | null
          passo_atual?: number
          perfil_curador_id?: string
          situacao?: Database["public"]["Enums"]["situacao_avaliacao"]
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "envio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_perfil_curador_id_fkey"
            columns: ["perfil_curador_id"]
            isOneToOne: false
            referencedRelation: "perfil_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      compartilhamento: {
        Row: {
          avaliacao_id: string
          criado_em: string
          descricao: string | null
          id: string
          midia_curador_id: string | null
          modalidade: Database["public"]["Enums"]["modalidade_compartilhamento"]
          url: string | null
          verificado_em: string | null
        }
        Insert: {
          avaliacao_id: string
          criado_em?: string
          descricao?: string | null
          id?: string
          midia_curador_id?: string | null
          modalidade: Database["public"]["Enums"]["modalidade_compartilhamento"]
          url?: string | null
          verificado_em?: string | null
        }
        Update: {
          avaliacao_id?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          midia_curador_id?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade_compartilhamento"]
          url?: string | null
          verificado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compartilhamento_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compartilhamento_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "nota_avaliacao"
            referencedColumns: ["avaliacao_id"]
          },
          {
            foreignKeyName: "compartilhamento_midia_curador_id_fkey"
            columns: ["midia_curador_id"]
            isOneToOne: false
            referencedRelation: "midia_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          descricao: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          descricao: string
          valor: Json
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          descricao?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      convite_admin: {
        Row: {
          aceito_em: string | null
          convidado_por: string
          criado_em: string
          email: string
          expira_em: string
          id: string
          papel_admin: Database["public"]["Enums"]["papel_admin"]
          token_hash: string
        }
        Insert: {
          aceito_em?: string | null
          convidado_por: string
          criado_em?: string
          email: string
          expira_em: string
          id?: string
          papel_admin: Database["public"]["Enums"]["papel_admin"]
          token_hash: string
        }
        Update: {
          aceito_em?: string | null
          convidado_por?: string
          criado_em?: string
          email?: string
          expira_em?: string
          id?: string
          papel_admin?: Database["public"]["Enums"]["papel_admin"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "convite_admin_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      credencial_curador: {
        Row: {
          criado_em: string
          descricao: string
          id: string
          perfil_curador_id: string
          tipo: string
          url: string | null
          verificavel: boolean | null
        }
        Insert: {
          criado_em?: string
          descricao: string
          id?: string
          perfil_curador_id: string
          tipo: string
          url?: string | null
          verificavel?: boolean | null
        }
        Update: {
          criado_em?: string
          descricao?: string
          id?: string
          perfil_curador_id?: string
          tipo?: string
          url?: string | null
          verificavel?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "credencial_curador_perfil_curador_id_fkey"
            columns: ["perfil_curador_id"]
            isOneToOne: false
            referencedRelation: "perfil_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      criterio: {
        Row: {
          ativo: boolean
          chave: string
          grupo: Database["public"]["Enums"]["grupo_criterio"]
          obrigatorio: boolean
          ordem: number
          rotulo: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          grupo: Database["public"]["Enums"]["grupo_criterio"]
          obrigatorio?: boolean
          ordem: number
          rotulo: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          grupo?: Database["public"]["Enums"]["grupo_criterio"]
          obrigatorio?: boolean
          ordem?: number
          rotulo?: string
        }
        Relationships: []
      }
      envio: {
        Row: {
          atualizado_em: string
          avisado_prazo_em: string | null
          concluido_em: string | null
          criado_em: string
          devolucao_em: string
          devolvido_em: string | null
          faixa_id: string
          id: string
          iniciou_em: string | null
          ouviu_em: string | null
          perfil_curador_id: string
          prazo_em: string
          situacao: Database["public"]["Enums"]["situacao_envio"]
          total_claves: number
        }
        Insert: {
          atualizado_em?: string
          avisado_prazo_em?: string | null
          concluido_em?: string | null
          criado_em?: string
          devolucao_em: string
          devolvido_em?: string | null
          faixa_id: string
          id?: string
          iniciou_em?: string | null
          ouviu_em?: string | null
          perfil_curador_id: string
          prazo_em: string
          situacao?: Database["public"]["Enums"]["situacao_envio"]
          total_claves: number
        }
        Update: {
          atualizado_em?: string
          avisado_prazo_em?: string | null
          concluido_em?: string | null
          criado_em?: string
          devolucao_em?: string
          devolvido_em?: string | null
          faixa_id?: string
          id?: string
          iniciou_em?: string | null
          ouviu_em?: string | null
          perfil_curador_id?: string
          prazo_em?: string
          situacao?: Database["public"]["Enums"]["situacao_envio"]
          total_claves?: number
        }
        Relationships: [
          {
            foreignKeyName: "envio_faixa_id_fkey"
            columns: ["faixa_id"]
            isOneToOne: false
            referencedRelation: "faixa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_perfil_curador_id_fkey"
            columns: ["perfil_curador_id"]
            isOneToOne: false
            referencedRelation: "perfil_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_notificacao: {
        Row: {
          canais_padrao: Database["public"]["Enums"]["canal_notificacao"][]
          chave: string
          critico: boolean
          destinatario: Database["public"]["Enums"]["papel"][]
          modulo_origem: string
          rota_destino: string
          titulo: string
        }
        Insert: {
          canais_padrao: Database["public"]["Enums"]["canal_notificacao"][]
          chave: string
          critico?: boolean
          destinatario: Database["public"]["Enums"]["papel"][]
          modulo_origem: string
          rota_destino: string
          titulo: string
        }
        Update: {
          canais_padrao?: Database["public"]["Enums"]["canal_notificacao"][]
          chave?: string
          critico?: boolean
          destinatario?: Database["public"]["Enums"]["papel"][]
          modulo_origem?: string
          rota_destino?: string
          titulo?: string
        }
        Relationships: []
      }
      evento_provedor: {
        Row: {
          carga: Json
          id_evento_provedor: string
          processado_em: string | null
          provedor: string
          recebido_em: string
          tipo: string
        }
        Insert: {
          carga: Json
          id_evento_provedor: string
          processado_em?: string | null
          provedor: string
          recebido_em?: string
          tipo: string
        }
        Update: {
          carga?: Json
          id_evento_provedor?: string
          processado_em?: string | null
          provedor?: string
          recebido_em?: string
          tipo?: string
        }
        Relationships: []
      }
      faixa: {
        Row: {
          arquivo_caminho: string | null
          atualizado_em: string
          capa_caminho: string | null
          contexto_curador: string | null
          criado_em: string
          data_lancamento: string | null
          duracao_segundos: number | null
          estilo: string | null
          genero: string | null
          id: string
          lancada: boolean | null
          metadados_detectados: Json | null
          origem: Database["public"]["Enums"]["origem_faixa"]
          perfil_artista_id: string
          situacao: Database["public"]["Enums"]["situacao_faixa"]
          titulo: string
          url_spotify: string | null
          url_youtube: string | null
        }
        Insert: {
          arquivo_caminho?: string | null
          atualizado_em?: string
          capa_caminho?: string | null
          contexto_curador?: string | null
          criado_em?: string
          data_lancamento?: string | null
          duracao_segundos?: number | null
          estilo?: string | null
          genero?: string | null
          id?: string
          lancada?: boolean | null
          metadados_detectados?: Json | null
          origem: Database["public"]["Enums"]["origem_faixa"]
          perfil_artista_id: string
          situacao?: Database["public"]["Enums"]["situacao_faixa"]
          titulo: string
          url_spotify?: string | null
          url_youtube?: string | null
        }
        Update: {
          arquivo_caminho?: string | null
          atualizado_em?: string
          capa_caminho?: string | null
          contexto_curador?: string | null
          criado_em?: string
          data_lancamento?: string | null
          duracao_segundos?: number | null
          estilo?: string | null
          genero?: string | null
          id?: string
          lancada?: boolean | null
          metadados_detectados?: Json | null
          origem?: Database["public"]["Enums"]["origem_faixa"]
          perfil_artista_id?: string
          situacao?: Database["public"]["Enums"]["situacao_faixa"]
          titulo?: string
          url_spotify?: string | null
          url_youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faixa_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "perfil_artista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faixa_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "saldo_carteira"
            referencedColumns: ["perfil_artista_id"]
          },
        ]
      }
      ganho_curador: {
        Row: {
          acrescimos: Json
          avaliacao_id: string
          base_centavos: number
          base_claves: number
          classe: Database["public"]["Enums"]["classe_curador"]
          comissao_centavos: number
          criado_em: string
          id: string
          no_prazo: boolean
          penalidade_prazo: boolean
          percentual_aplicado: number
          perfil_curador_id: string
          piso_percentual: number
          situacao: Database["public"]["Enums"]["situacao_ganho"]
          teto_percentual: number
          valor_centavos: number
        }
        Insert: {
          acrescimos?: Json
          avaliacao_id: string
          base_centavos: number
          base_claves: number
          classe: Database["public"]["Enums"]["classe_curador"]
          comissao_centavos: number
          criado_em?: string
          id?: string
          no_prazo: boolean
          penalidade_prazo?: boolean
          percentual_aplicado: number
          perfil_curador_id: string
          piso_percentual: number
          situacao?: Database["public"]["Enums"]["situacao_ganho"]
          teto_percentual: number
          valor_centavos: number
        }
        Update: {
          acrescimos?: Json
          avaliacao_id?: string
          base_centavos?: number
          base_claves?: number
          classe?: Database["public"]["Enums"]["classe_curador"]
          comissao_centavos?: number
          criado_em?: string
          id?: string
          no_prazo?: boolean
          penalidade_prazo?: boolean
          percentual_aplicado?: number
          perfil_curador_id?: string
          piso_percentual?: number
          situacao?: Database["public"]["Enums"]["situacao_ganho"]
          teto_percentual?: number
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "ganho_curador_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ganho_curador_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "nota_avaliacao"
            referencedColumns: ["avaliacao_id"]
          },
          {
            foreignKeyName: "ganho_curador_perfil_curador_id_fkey"
            columns: ["perfil_curador_id"]
            isOneToOne: false
            referencedRelation: "perfil_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamento_clave: {
        Row: {
          criado_em: string
          descricao: string
          envio_id: string | null
          id: number
          pedido_clave_id: string | null
          perfil_artista_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_lancamento_clave"]
        }
        Insert: {
          criado_em?: string
          descricao: string
          envio_id?: string | null
          id?: never
          pedido_clave_id?: string | null
          perfil_artista_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_lancamento_clave"]
        }
        Update: {
          criado_em?: string
          descricao?: string
          envio_id?: string | null
          id?: never
          pedido_clave_id?: string | null
          perfil_artista_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["tipo_lancamento_clave"]
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_clave_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_clave_pedido_clave_id_fkey"
            columns: ["pedido_clave_id"]
            isOneToOne: false
            referencedRelation: "pedido_clave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_clave_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "perfil_artista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_clave_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "saldo_carteira"
            referencedColumns: ["perfil_artista_id"]
          },
        ]
      }
      log_auditoria: {
        Row: {
          acao: string
          antes: Json | null
          ator_id: string | null
          criado_em: string
          depois: Json | null
          id: number
          motivo: string | null
          registro_id: string | null
          tabela: string
        }
        Insert: {
          acao: string
          antes?: Json | null
          ator_id?: string | null
          criado_em?: string
          depois?: Json | null
          id?: never
          motivo?: string | null
          registro_id?: string | null
          tabela: string
        }
        Update: {
          acao?: string
          antes?: Json | null
          ator_id?: string | null
          criado_em?: string
          depois?: Json | null
          id?: never
          motivo?: string | null
          registro_id?: string | null
          tabela?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_auditoria_ator_id_fkey"
            columns: ["ator_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      membro_admin: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cargo: string | null
          criado_em: string
          id: string
          papel_admin: Database["public"]["Enums"]["papel_admin"]
          perfil_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cargo?: string | null
          criado_em?: string
          id?: string
          papel_admin: Database["public"]["Enums"]["papel_admin"]
          perfil_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cargo?: string | null
          criado_em?: string
          id?: string
          papel_admin?: Database["public"]["Enums"]["papel_admin"]
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membro_admin_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      midia_curador: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          perfil_curador_id: string
          salvamentos: number | null
          tipo: Database["public"]["Enums"]["tipo_midia"]
          url: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          perfil_curador_id: string
          salvamentos?: number | null
          tipo: Database["public"]["Enums"]["tipo_midia"]
          url: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          perfil_curador_id?: string
          salvamentos?: number | null
          tipo?: Database["public"]["Enums"]["tipo_midia"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "midia_curador_perfil_curador_id_fkey"
            columns: ["perfil_curador_id"]
            isOneToOne: false
            referencedRelation: "perfil_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_criterio: {
        Row: {
          avaliacao_id: string
          criterio: string
          id: string
          justificativa: string | null
          nota: number
        }
        Insert: {
          avaliacao_id: string
          criterio: string
          id?: string
          justificativa?: string | null
          nota: number
        }
        Update: {
          avaliacao_id?: string
          criterio?: string
          id?: string
          justificativa?: string | null
          nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "nota_criterio_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_criterio_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "nota_avaliacao"
            referencedColumns: ["avaliacao_id"]
          },
          {
            foreignKeyName: "nota_criterio_criterio_fkey"
            columns: ["criterio"]
            isOneToOne: false
            referencedRelation: "criterio"
            referencedColumns: ["chave"]
          },
        ]
      }
      notificacao: {
        Row: {
          canais: Database["public"]["Enums"]["canal_notificacao"][]
          contexto: Json
          corpo: string | null
          criado_em: string
          enviada_email_em: string | null
          evento: string
          id: string
          lida_em: string | null
          perfil_id: string
          rota: string | null
          titulo: string
        }
        Insert: {
          canais: Database["public"]["Enums"]["canal_notificacao"][]
          contexto?: Json
          corpo?: string | null
          criado_em?: string
          enviada_email_em?: string | null
          evento: string
          id?: string
          lida_em?: string | null
          perfil_id: string
          rota?: string | null
          titulo: string
        }
        Update: {
          canais?: Database["public"]["Enums"]["canal_notificacao"][]
          contexto?: Json
          corpo?: string | null
          criado_em?: string
          enviada_email_em?: string | null
          evento?: string
          id?: string
          lida_em?: string | null
          perfil_id?: string
          rota?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_evento_fkey"
            columns: ["evento"]
            isOneToOne: false
            referencedRelation: "evento_notificacao"
            referencedColumns: ["chave"]
          },
          {
            foreignKeyName: "notificacao_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      pacote_clave: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          desconto_percentual: number
          excluido_em: string | null
          id: string
          nome: string
          quantidade_claves: number
          valor_centavos: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          desconto_percentual?: number
          excluido_em?: string | null
          id?: string
          nome: string
          quantidade_claves: number
          valor_centavos: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          desconto_percentual?: number
          excluido_em?: string | null
          id?: string
          nome?: string
          quantidade_claves?: number
          valor_centavos?: number
        }
        Relationships: []
      }
      papel_usuario: {
        Row: {
          ativado_em: string
          ativo: boolean
          id: string
          papel: Database["public"]["Enums"]["papel"]
          perfil_id: string
        }
        Insert: {
          ativado_em?: string
          ativo?: boolean
          id?: string
          papel: Database["public"]["Enums"]["papel"]
          perfil_id: string
        }
        Update: {
          ativado_em?: string
          ativo?: boolean
          id?: string
          papel?: Database["public"]["Enums"]["papel"]
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papel_usuario_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_clave: {
        Row: {
          atualizado_em: string
          criado_em: string
          desconto_centavos: number
          id: string
          meio: Database["public"]["Enums"]["meio_pagamento"]
          pacote_clave_id: string | null
          pago_em: string | null
          perfil_artista_id: string
          pix_payload: string | null
          pix_qr: string | null
          provedor: string
          provedor_cobranca_id: string | null
          quantidade_claves: number
          situacao: Database["public"]["Enums"]["situacao_pedido"]
          valor_bruto_centavos: number
          valor_total_centavos: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          desconto_centavos?: number
          id?: string
          meio: Database["public"]["Enums"]["meio_pagamento"]
          pacote_clave_id?: string | null
          pago_em?: string | null
          perfil_artista_id: string
          pix_payload?: string | null
          pix_qr?: string | null
          provedor?: string
          provedor_cobranca_id?: string | null
          quantidade_claves: number
          situacao?: Database["public"]["Enums"]["situacao_pedido"]
          valor_bruto_centavos: number
          valor_total_centavos: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          desconto_centavos?: number
          id?: string
          meio?: Database["public"]["Enums"]["meio_pagamento"]
          pacote_clave_id?: string | null
          pago_em?: string | null
          perfil_artista_id?: string
          pix_payload?: string | null
          pix_qr?: string | null
          provedor?: string
          provedor_cobranca_id?: string | null
          quantidade_claves?: number
          situacao?: Database["public"]["Enums"]["situacao_pedido"]
          valor_bruto_centavos?: number
          valor_total_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_clave_pacote_clave_id_fkey"
            columns: ["pacote_clave_id"]
            isOneToOne: false
            referencedRelation: "pacote_clave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_clave_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "perfil_artista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_clave_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "saldo_carteira"
            referencedColumns: ["perfil_artista_id"]
          },
        ]
      }
      perfil: {
        Row: {
          aceite_termos_em: string | null
          atualizado_em: string
          cidade: string | null
          criado_em: string
          desativada_em: string | null
          foto_caminho: string | null
          handle: string | null
          id: string
          idioma: string
          nome_completo: string
          nome_exibicao: string | null
          situacao: Database["public"]["Enums"]["situacao_conta"]
        }
        Insert: {
          aceite_termos_em?: string | null
          atualizado_em?: string
          cidade?: string | null
          criado_em?: string
          desativada_em?: string | null
          foto_caminho?: string | null
          handle?: string | null
          id: string
          idioma?: string
          nome_completo: string
          nome_exibicao?: string | null
          situacao?: Database["public"]["Enums"]["situacao_conta"]
        }
        Update: {
          aceite_termos_em?: string | null
          atualizado_em?: string
          cidade?: string | null
          criado_em?: string
          desativada_em?: string | null
          foto_caminho?: string | null
          handle?: string | null
          id?: string
          idioma?: string
          nome_completo?: string
          nome_exibicao?: string | null
          situacao?: Database["public"]["Enums"]["situacao_conta"]
        }
        Relationships: []
      }
      perfil_artista: {
        Row: {
          atualizado_em: string
          bio: string | null
          cobranca_documento: string | null
          cobranca_nome: string | null
          criado_em: string
          generos: string[] | null
          id: string
          link_instagram: string | null
          link_site: string | null
          link_spotify: string | null
          link_youtube: string | null
          perfil_id: string
        }
        Insert: {
          atualizado_em?: string
          bio?: string | null
          cobranca_documento?: string | null
          cobranca_nome?: string | null
          criado_em?: string
          generos?: string[] | null
          id?: string
          link_instagram?: string | null
          link_site?: string | null
          link_spotify?: string | null
          link_youtube?: string | null
          perfil_id: string
        }
        Update: {
          atualizado_em?: string
          bio?: string | null
          cobranca_documento?: string | null
          cobranca_nome?: string | null
          criado_em?: string
          generos?: string[] | null
          id?: string
          link_instagram?: string | null
          link_site?: string | null
          link_spotify?: string | null
          link_youtube?: string | null
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_artista_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_curador: {
        Row: {
          asaas_carteira_id: string | null
          atuacao: string[] | null
          atualizado_em: string
          bio: string | null
          cadastro_concluido_em: string | null
          chave_pix: string | null
          chave_pix_situacao: string | null
          chave_pix_tipo: string | null
          classe: Database["public"]["Enums"]["classe_curador"]
          classificado_em: string | null
          criado_em: string
          especialidade: string | null
          formacao: string | null
          generos: string[] | null
          id: string
          link_participacao_disco: string | null
          participacao_disco: boolean | null
          passo_cadastro: number
          perfil_id: string
          premios: string | null
          situacao: Database["public"]["Enums"]["situacao_curador"]
          tempo_atuacao: string | null
        }
        Insert: {
          asaas_carteira_id?: string | null
          atuacao?: string[] | null
          atualizado_em?: string
          bio?: string | null
          cadastro_concluido_em?: string | null
          chave_pix?: string | null
          chave_pix_situacao?: string | null
          chave_pix_tipo?: string | null
          classe?: Database["public"]["Enums"]["classe_curador"]
          classificado_em?: string | null
          criado_em?: string
          especialidade?: string | null
          formacao?: string | null
          generos?: string[] | null
          id?: string
          link_participacao_disco?: string | null
          participacao_disco?: boolean | null
          passo_cadastro?: number
          perfil_id: string
          premios?: string | null
          situacao?: Database["public"]["Enums"]["situacao_curador"]
          tempo_atuacao?: string | null
        }
        Update: {
          asaas_carteira_id?: string | null
          atuacao?: string[] | null
          atualizado_em?: string
          bio?: string | null
          cadastro_concluido_em?: string | null
          chave_pix?: string | null
          chave_pix_situacao?: string | null
          chave_pix_tipo?: string | null
          classe?: Database["public"]["Enums"]["classe_curador"]
          classificado_em?: string | null
          criado_em?: string
          especialidade?: string | null
          formacao?: string | null
          generos?: string[] | null
          id?: string
          link_participacao_disco?: string | null
          participacao_disco?: boolean | null
          passo_cadastro?: number
          perfil_id?: string
          premios?: string | null
          situacao?: Database["public"]["Enums"]["situacao_curador"]
          tempo_atuacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_curador_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      permissao_admin: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          modulo: string
          papel_admin: Database["public"]["Enums"]["papel_admin"]
          pode_escrever: boolean
          pode_ler: boolean
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          modulo: string
          papel_admin: Database["public"]["Enums"]["papel_admin"]
          pode_escrever?: boolean
          pode_ler?: boolean
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          modulo?: string
          papel_admin?: Database["public"]["Enums"]["papel_admin"]
          pode_escrever?: boolean
          pode_ler?: boolean
        }
        Relationships: []
      }
      preferencia_notificacao: {
        Row: {
          email: boolean
          evento: string
          id: string
          in_app: boolean
          perfil_id: string
        }
        Insert: {
          email?: boolean
          evento: string
          id?: string
          in_app?: boolean
          perfil_id: string
        }
        Update: {
          email?: boolean
          evento?: string
          id?: string
          in_app?: boolean
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencia_notificacao_evento_fkey"
            columns: ["evento"]
            isOneToOne: false
            referencedRelation: "evento_notificacao"
            referencedColumns: ["chave"]
          },
          {
            foreignKeyName: "preferencia_notificacao_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_curador: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          perfil_curador_id: string
          preco_claves: number
          tipo: Database["public"]["Enums"]["tipo_servico"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          perfil_curador_id: string
          preco_claves: number
          tipo: Database["public"]["Enums"]["tipo_servico"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          perfil_curador_id?: string
          preco_claves?: number
          tipo?: Database["public"]["Enums"]["tipo_servico"]
        }
        Relationships: [
          {
            foreignKeyName: "servico_curador_perfil_curador_id_fkey"
            columns: ["perfil_curador_id"]
            isOneToOne: false
            referencedRelation: "perfil_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      servico_envio: {
        Row: {
          envio_id: string
          id: string
          preco_claves: number
          servico_curador_id: string
          tipo: Database["public"]["Enums"]["tipo_servico"]
        }
        Insert: {
          envio_id: string
          id?: string
          preco_claves: number
          servico_curador_id: string
          tipo: Database["public"]["Enums"]["tipo_servico"]
        }
        Update: {
          envio_id?: string
          id?: string
          preco_claves?: number
          servico_curador_id?: string
          tipo?: Database["public"]["Enums"]["tipo_servico"]
        }
        Relationships: [
          {
            foreignKeyName: "servico_envio_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_envio_servico_curador_id_fkey"
            columns: ["servico_curador_id"]
            isOneToOne: false
            referencedRelation: "servico_curador"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      nota_artista: {
        Row: {
          avaliacoes: number | null
          faixas_avaliadas: number | null
          nf_media: number | null
          perfil_artista_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faixa_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "perfil_artista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faixa_perfil_artista_id_fkey"
            columns: ["perfil_artista_id"]
            isOneToOne: false
            referencedRelation: "saldo_carteira"
            referencedColumns: ["perfil_artista_id"]
          },
        ]
      }
      nota_avaliacao: {
        Row: {
          avaliacao_id: string | null
          criterios_respondidos: number | null
          envio_id: string | null
          nf: number | null
          no: number | null
          ns: number | null
          perfil_curador_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "envio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_perfil_curador_id_fkey"
            columns: ["perfil_curador_id"]
            isOneToOne: false
            referencedRelation: "perfil_curador"
            referencedColumns: ["id"]
          },
        ]
      }
      saldo_carteira: {
        Row: {
          comprometido: number | null
          devolvido: number | null
          disponivel: number | null
          perfil_artista_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aceitar_convite_admin: { Args: { p_token: string }; Returns: string }
      avaliacao_em_rascunho_do_curador: {
        Args: { p_avaliacao_id: string }
        Returns: boolean
      }
      avisar_prazo_72h: {
        Args: { p_janela?: string; p_limite?: number }
        Returns: number
      }
      calcular_remuneracao: {
        Args: {
          p_base_claves: number
          p_classe: Database["public"]["Enums"]["classe_curador"]
          p_no_prazo: boolean
          p_opcionais?: Json
        }
        Returns: {
          acrescimos: Json
          base_centavos: number
          comissao_centavos: number
          penalidade_prazo: boolean
          percentual_aplicado: number
          piso_percentual: number
          teto_percentual: number
          valor_centavos: number
        }[]
      }
      confirmar_pedido_clave: { Args: { p_pedido_id: string }; Returns: number }
      confirmar_selecao_curadores: {
        Args: { p_faixa_id: string; p_selecao: Json }
        Returns: string[]
      }
      criar_pedido_clave: {
        Args: {
          p_meio: Database["public"]["Enums"]["meio_pagamento"]
          p_pacote_clave_id: string
        }
        Returns: string
      }
      curador_tem_envio_ativo_na_faixa: {
        Args: { p_faixa_id: string }
        Returns: boolean
      }
      curador_tem_envio_ativo_no_caminho: {
        Args: { p_caminho: string }
        Returns: boolean
      }
      devolver_claves_sem_resposta: {
        Args: { p_limite?: number }
        Returns: number
      }
      e_admin: { Args: never; Returns: boolean }
      enviar_avaliacao: {
        Args: {
          p_compartilhamento?: Json
          p_envio_id: string
          p_escuta_percentual: number
          p_feedback: string
          p_nota_subjetiva: number
          p_notas: Json
        }
        Returns: string
      }
      expurgar_contas_excluidas: {
        Args: { p_limite?: number }
        Returns: number
      }
      ler_contexto_sessao: {
        Args: never
        Returns: {
          cadastro_curador_concluido: boolean
          papeis: Database["public"]["Enums"]["papel"][]
        }[]
      }
      meu_perfil_artista_id: { Args: never; Returns: string }
      meu_perfil_curador_id: { Args: never; Returns: string }
      posso_ver_avaliacao: {
        Args: { p_avaliacao_id: string }
        Returns: boolean
      }
      posso_ver_envio: { Args: { p_envio_id: string }; Returns: boolean }
      registrar_evento_provedor: {
        Args: {
          p_carga: Json
          p_id_evento: string
          p_provedor: string
          p_tipo: string
        }
        Returns: boolean
      }
      registrar_notificacao: {
        Args: {
          p_contexto?: Json
          p_corpo?: string
          p_evento: string
          p_perfil_id: string
          p_rota?: string
        }
        Returns: string
      }
      sou_dono_da_faixa: { Args: { p_faixa_id: string }; Returns: boolean }
      sou_dono_do_envio: { Args: { p_envio_id: string }; Returns: boolean }
      tem_papel: {
        Args: { p: Database["public"]["Enums"]["papel"] }
        Returns: boolean
      }
      tem_permissao: {
        Args: { p_escrita?: boolean; p_modulo: string }
        Returns: boolean
      }
    }
    Enums: {
      canal_notificacao: "in_app" | "email"
      classe_curador: "bronze" | "prata" | "ouro"
      grupo_criterio:
        | "execucao_tecnica"
        | "composicao"
        | "identidade"
        | "impacto"
        | "producao"
      meio_pagamento: "pix" | "cartao"
      modalidade_compartilhamento:
        | "playlist"
        | "post"
        | "materia"
        | "outros"
        | "nao_compartilhou"
      origem_faixa: "link" | "arquivo"
      papel: "artista" | "curador" | "admin"
      papel_admin: "administrador" | "moderador" | "financeiro" | "suporte"
      situacao_avaliacao: "rascunho" | "concluida"
      situacao_conta: "ativa" | "bloqueada" | "desativada" | "excluida"
      situacao_curador:
        | "rascunho"
        | "bronze_aprovado"
        | "prata_em_analise"
        | "prata_aprovado"
        | "prata_recusado"
      situacao_envio:
        | "recebeu"
        | "ouviu"
        | "avaliando"
        | "pronto"
        | "devolvido"
        | "cancelado"
      situacao_faixa:
        | "rascunho"
        | "aguardando_selecao"
        | "em_curadoria"
        | "concluida"
      situacao_ganho: "liberado" | "em_saque" | "pago" | "cancelado"
      situacao_pedido:
        | "criado"
        | "processando"
        | "aprovado"
        | "recusado"
        | "expirado"
        | "estornado"
      tipo_lancamento_clave:
        | "compra"
        | "consumo"
        | "devolucao"
        | "estorno"
        | "ajuste"
      tipo_midia:
        | "playlist"
        | "youtube"
        | "instagram"
        | "site"
        | "blog"
        | "radio"
        | "podcast"
        | "outro"
      tipo_servico: "feedback" | "playlist" | "post" | "materia" | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      canal_notificacao: ["in_app", "email"],
      classe_curador: ["bronze", "prata", "ouro"],
      grupo_criterio: [
        "execucao_tecnica",
        "composicao",
        "identidade",
        "impacto",
        "producao",
      ],
      meio_pagamento: ["pix", "cartao"],
      modalidade_compartilhamento: [
        "playlist",
        "post",
        "materia",
        "outros",
        "nao_compartilhou",
      ],
      origem_faixa: ["link", "arquivo"],
      papel: ["artista", "curador", "admin"],
      papel_admin: ["administrador", "moderador", "financeiro", "suporte"],
      situacao_avaliacao: ["rascunho", "concluida"],
      situacao_conta: ["ativa", "bloqueada", "desativada", "excluida"],
      situacao_curador: [
        "rascunho",
        "bronze_aprovado",
        "prata_em_analise",
        "prata_aprovado",
        "prata_recusado",
      ],
      situacao_envio: [
        "recebeu",
        "ouviu",
        "avaliando",
        "pronto",
        "devolvido",
        "cancelado",
      ],
      situacao_faixa: [
        "rascunho",
        "aguardando_selecao",
        "em_curadoria",
        "concluida",
      ],
      situacao_ganho: ["liberado", "em_saque", "pago", "cancelado"],
      situacao_pedido: [
        "criado",
        "processando",
        "aprovado",
        "recusado",
        "expirado",
        "estornado",
      ],
      tipo_lancamento_clave: [
        "compra",
        "consumo",
        "devolucao",
        "estorno",
        "ajuste",
      ],
      tipo_midia: [
        "playlist",
        "youtube",
        "instagram",
        "site",
        "blog",
        "radio",
        "podcast",
        "outro",
      ],
      tipo_servico: ["feedback", "playlist", "post", "materia", "outro"],
    },
  },
} as const
