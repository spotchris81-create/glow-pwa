import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Cliente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
};

export type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_min: number;
  precio: number;
  activo: boolean;
};

export type Cita = {
  id: string;
  cliente_id: string;
  servicio_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "pendiente" | "confirmada" | "cancelada" | "completada";
  notas: string | null;
  created_at: string;
};