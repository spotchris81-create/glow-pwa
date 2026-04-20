import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  citas_asistidas: number;
  citas_perdidas: number;
  created_at: string;
};

export type Servicio = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  duracion_minutos: number;
  activo: boolean;
  created_at: string;
};

export type Cita = {
  id: string;
  cliente_id: string;
  servicio_id: string;
  fecha_hora: string;
  estado: "pendiente" | "confirmada" | "cancelada" | "completada";
  notas: string | null;
  created_at: string;
};