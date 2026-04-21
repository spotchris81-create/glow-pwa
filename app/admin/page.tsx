"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ─── PALETA ───────────────────────────────────────────────
const C = {
  rose:      "#ECA8A9",
  roseDark:  "#d4878a",
  roseLight: "#FFF0F1",
  roseMid:   "#f9dede",
  roseDeep:  "#c96b6d",
  bg:        "#FFF5F7",
  bgAlt:     "#FAFAFA",
  white:     "#FFFFFF",
  text:      "#333333",
  text2:     "#777777",
  text3:     "#aaaaaa",
  green:     "#22c55e",
  greenBg:   "#f0fdf4",
  greenBd:   "#bbf7d0",
  red:       "#e05555",
  redBg:     "#fff1f1",
  redBd:     "#fecaca",
  blue:      "#3b82f6",
  blueBg:    "#eff6ff",
  amber:     "#f59e0b",
  amberBg:   "#fffbeb",
  wa:        "#25D366",
} as const;

const FONT_TITLE = "'Playfair Display', Georgia, serif";
const FONT_BODY  = "'Inter', 'Segoe UI', sans-serif";
const PASSWORD   = "admin2025";

// ─── TIPOS ───────────────────────────────────────────────
type CitaRow  = {
  id: string; fecha_hora: string; estado: string; notas: string | null;
  clientes: { id: string; nombre: string; telefono: string | null } | null;
  servicios: { nombre: string; precio: number } | null;
};
type Cliente  = { id: string; nombre: string; telefono: string | null; citas_asistidas: number; citas_perdidas: number };
type Servicio = { id: string; nombre: string; precio: number; activo: boolean; duracion_minutos: number };
type Tab      = "resumo" | "calendario" | "crm" | "servicos";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "resumo",     label: "Resumo",     icon: "📊" },
  { key: "calendario", label: "Calendário", icon: "📅" },
  { key: "crm",        label: "CRM",        icon: "👥" },
  { key: "servicos",   label: "Serviços",   icon: "✨" },
];

const ESTADO_COLOR: Record<string, string> = {
  pendiente:  C.amber,
  confirmada: C.blue,
  completada: C.green,
  cancelada:  C.red,
};

const HORAS_AGENDA = Array.from({ length: 12 }, (_, i) =>
  `${String(i + 9).padStart(2, "0")}:00`
);

// ─── HELPERS ─────────────────────────────────────────────
function hojeISO() { return new Date().toISOString().split("T")[0]; }

function diaBounds(dia: string) {
  return { ini: new Date(`${dia}T00:00:00`).toISOString(), fim: new Date(`${dia}T23:59:59`).toISOString() };
}
function semanaBounds() {
  const fim = new Date(); fim.setHours(23,59,59,999);
  const ini = new Date(); ini.setDate(ini.getDate() - 6); ini.setHours(0,0,0,0);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
}
function mesBounds() {
  const now = new Date();
  const ini = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
  const fim = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
}
function horaDeISO(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:00`;
}
function horaMinDeISO(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// Extrae precio cobrado de notas: "[Preço Cobrado: 45€]"
function extrairPrecoCobrado(notas: string | null): string | null {
  if (!notas) return null;
  const m = notas.match(/\[Preço Cobrado:\s*([\d.]+)€\]/);
  return m ? m[1] : null;
}

// ─── ESTILOS ─────────────────────────────────────────────
const S = {
  btnRose:  { background: C.rose, color: C.white, border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontFamily: FONT_BODY } as React.CSSProperties,
  btnOut:   { background: C.white, color: C.text2, border: `1.5px solid ${C.roseMid}`, borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY } as React.CSSProperties,
  mini:     { borderRadius: "8px", padding: "5px 11px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", border: "none", fontFamily: FONT_BODY } as React.CSSProperties,
  inp:      { width: "100%", background: C.bgAlt, border: `1.5px solid ${C.roseMid}`, borderRadius: "10px", color: C.text, fontSize: "0.9rem", padding: "0.65rem 0.85rem", outline: "none", boxSizing: "border-box" as const, fontFamily: FONT_BODY, colorScheme: "light" as const, marginBottom: "0.2rem" } as React.CSSProperties,
  lbl:      { color: C.text2, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "5px", display: "block", marginTop: "0.75rem", fontFamily: FONT_BODY } as React.CSSProperties,
  card:     { background: C.white, border: `1px solid ${C.roseMid}`, borderRadius: "12px", padding: "0.9rem 1.1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" as const, boxShadow: `0 2px 12px rgba(236,168,169,0.1)` } as React.CSSProperties,
  secTitle: { fontFamily: FONT_TITLE, color: C.text, fontWeight: 700, fontSize: "1.3rem", margin: "0 0 1.25rem", letterSpacing: "-0.01em" } as React.CSSProperties,
};

// ─── COMPONENTE ───────────────────────────────────────────
export default function AdminPage() {
  const [auth,        setAuth]        = useState(false);
  const [pwd,         setPwd]         = useState("");
  const [pwdErr,      setPwdErr]      = useState(false);
  const [tab,         setTab]         = useState<Tab>("resumo");
  const [citas,       setCitas]       = useState<CitaRow[]>([]);
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [servicios,   setServicios]   = useState<Servicio[]>([]);
  const [diaVer,      setDiaVer]      = useState(hojeISO());
  const [fatHoje,     setFatHoje]     = useState(0);
  const [fatSemana,   setFatSemana]   = useState(0);
  const [fatMes,      setFatMes]      = useState(0);
  const [modalWalkin, setModalWalkin] = useState(false);
  const [walkinHora,  setWalkinHora]  = useState("");
  const [editPreco,   setEditPreco]   = useState<Record<string, string>>({});

  // Walk-in form
  const [wNome,       setWNome]       = useState("");
  const [wTelefone,   setWTelefone]   = useState("");
  const [wServicoId,  setWServicoId]  = useState("");
  const [wHora,       setWHora]       = useState("");
  const [wPreco,      setWPreco]      = useState("");   // precio editable

  const fetchCitas = useCallback(async () => {
    const { ini, fim } = diaBounds(diaVer);
    const { data } = await supabase.from("citas")
      .select("id, fecha_hora, estado, notas, clientes(id, nombre, telefono), servicios(nombre, precio)")
      .gte("fecha_hora", ini).lte("fecha_hora", fim).order("fecha_hora");
    if (data) setCitas(data as unknown as CitaRow[]);
  }, [diaVer]);

  const fetchFatHoje = useCallback(async () => {
    const { ini, fim } = diaBounds(hojeISO());
    const { data } = await supabase.from("citas").select("servicios(precio)")
      .eq("estado","completada").gte("fecha_hora",ini).lte("fecha_hora",fim);
    if (data) setFatHoje(data.reduce((a:number,c:any)=>a+(c.servicios?.precio??0),0));
  }, []);

  const fetchFatSemana = useCallback(async () => {
    const { ini, fim } = semanaBounds();
    const { data } = await supabase.from("citas").select("servicios(precio)")
      .eq("estado","completada").gte("fecha_hora",ini).lte("fecha_hora",fim);
    if (data) setFatSemana(data.reduce((a:number,c:any)=>a+(c.servicios?.precio??0),0));
  }, []);

  const fetchFatMes = useCallback(async () => {
    const { ini, fim } = mesBounds();
    const { data } = await supabase.from("citas").select("servicios(precio)")
      .eq("estado","completada").gte("fecha_hora",ini).lte("fecha_hora",fim);
    if (data) setFatMes(data.reduce((a:number,c:any)=>a+(c.servicios?.precio??0),0));
  }, []);

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase.from("clientes")
      .select("id, nombre, telefono, citas_asistidas, citas_perdidas").order("nombre");
    if (data) setClientes(data);
  }, []);

  const fetchServicios = useCallback(async () => {
    const { data } = await supabase.from("servicios")
      .select("id, nombre, precio, activo, duracion_minutos").order("nombre");
    if (data) {
      setServicios(data);
      const ep: Record<string,string> = {};
      data.forEach((sv:Servicio) => { ep[sv.id] = String(sv.precio); });
      setEditPreco(ep);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    fetchCitas(); fetchFatHoje(); fetchFatSemana(); fetchFatMes(); fetchClientes(); fetchServicios();
  }, [auth, fetchCitas, fetchFatHoje, fetchFatSemana, fetchFatMes, fetchClientes, fetchServicios]);

  // Actualizar precio por defecto cuando cambia servicio en walk-in
  useEffect(() => {
    const sv = servicios.find(s => s.id === wServicoId);
    if (sv) setWPreco(String(sv.precio));
    else setWPreco("");
  }, [wServicoId, servicios]);

  async function marcarEstado(id: string, estado: string) {
    await supabase.from("citas").update({ estado }).eq("id", id);
    fetchCitas(); fetchFatHoje(); fetchFatSemana(); fetchFatMes();
  }

  async function guardarWalkin() {
    if (!wNome || !wServicoId || !wHora) return;
    let cliente_id: string;
    const { data: ex } = await supabase.from("clientes").select("id").eq("telefono", wTelefone || wNome).single();
    if (ex) {
      cliente_id = ex.id;
    } else {
      const { data: nv } = await supabase.from("clientes")
        .insert({ nombre: wNome, telefono: wTelefone || null }).select("id").single();
      if (!nv) return;
      cliente_id = nv.id;
    }

    // Calcular nota con precio especial si difiere
    const sv          = servicios.find(s => s.id === wServicoId);
    const precoBase   = sv?.precio ?? 0;
    const precoCobr   = parseFloat(wPreco);
    let notaFinal     = "Walk-in";
    if (!isNaN(precoCobr) && precoCobr !== precoBase) {
      notaFinal = `Walk-in [Preço Cobrado: ${precoCobr}€]`;
    }

    await supabase.from("citas").insert({
      cliente_id,
      servicio_id: wServicoId,
      fecha_hora: new Date(`${diaVer}T${wHora}:00`).toISOString(),
      estado: "confirmada",
      notas: notaFinal,
    });

    setModalWalkin(false);
    setWNome(""); setWTelefone(""); setWServicoId(""); setWHora(""); setWPreco(""); setWalkinHora("");
    fetchCitas();
  }

  async function toggleServico(id: string, activo: boolean) {
    await supabase.from("servicios").update({ activo: !activo }).eq("id", id);
    fetchServicios();
  }

  async function guardarPreco(id: string) {
    const precio = parseFloat(editPreco[id]);
    if (isNaN(precio)) return;
    await supabase.from("servicios").update({ precio }).eq("id", id);
    fetchServicios();
  }

  function tentarLogin() {
    if (pwd === PASSWORD) { setAuth(true); setPwdErr(false); }
    else setPwdErr(true);
  }

  function abrirWalkin(hora?: string) {
    if (hora) { setWalkinHora(hora); setWHora(hora); }
    setModalWalkin(true);
  }

  // ── LOGIN ──
  if (!auth) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap'); *,*::before,*::after{box-sizing:border-box}`}</style>
      <div style={{ background: C.white, border: `1px solid ${C.roseMid}`, borderRadius: "24px", padding: "3rem 2.5rem", width: "100%", maxWidth: "380px", textAlign: "center", boxShadow: `0 12px 50px rgba(236,168,169,0.18)` }}>
        <div style={{ width: "64px", height: "64px", background: C.roseLight, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.6rem", color: C.rose }}>✦</div>
        <h2 style={{ fontFamily: FONT_TITLE, color: C.text, fontWeight: 700, margin: "0 0 0.4rem", fontSize: "1.5rem" }}>Área Restrita</h2>
        <p style={{ color: C.text2, fontSize: "0.85rem", marginBottom: "1.75rem" }}>Introduza a palavra-passe</p>
        <input type="password" style={{ ...S.inp, textAlign: "center", marginBottom: "0.75rem" }} placeholder="••••••••" value={pwd}
          onChange={e => { setPwd(e.target.value); setPwdErr(false); }}
          onKeyDown={e => { if (e.key === "Enter") tentarLogin(); }} />
        {pwdErr && <p style={{ color: C.red, fontSize: "0.82rem", marginBottom: "0.6rem" }}>Palavra-passe incorreta</p>}
        <button style={{ ...S.btnRose, width: "100%", padding: "0.85rem", fontSize: "0.95rem" }} onClick={tentarLogin}>Entrar</button>
      </div>
    </div>
  );

  const citasAtivas  = citas.filter(c => c.estado !== "cancelada");
  const citasConclui = citas.filter(c => c.estado === "completada");
  const citasPend    = citas.filter(c => c.estado === "pendiente");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY, color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        .tabs-scroll::-webkit-scrollbar{display:none}
        .agenda-slot:hover{background:${C.roseLight} !important;cursor:pointer}
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(0.4);cursor:pointer}
        @media(max-width:640px){
          .fat-grid{grid-template-columns:1fr !important}
          .resumo-grid{grid-template-columns:1fr 1fr !important}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.roseMid}`, display: "flex", alignItems: "center", gap: "1rem", padding: "0 1.5rem", height: "60px", position: "sticky", top: 0, zIndex: 50, boxShadow: `0 2px 16px rgba(236,168,169,0.1)` }}>
        <span style={{ fontFamily: FONT_TITLE, color: C.rose, fontWeight: 700, fontSize: "1.15rem" }}>Glow</span>
        <span style={{ color: C.roseDark, background: C.roseLight, border: `1px solid ${C.roseMid}`, borderRadius: "999px", fontSize: "0.65rem", padding: "2px 10px", fontWeight: 700, letterSpacing: "0.12em" }}>ADMIN</span>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ color: C.text2, fontSize: "0.82rem", textDecoration: "none", fontWeight: 500 }}>← Vista Cliente</a>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.75rem 1rem" }}>

        {/* TABS */}
        <div className="tabs-scroll" style={{ display: "flex", gap: "0.35rem", background: C.white, borderRadius: "14px", padding: "5px", marginBottom: "2rem", border: `1px solid ${C.roseMid}`, boxShadow: `0 2px 12px rgba(236,168,169,0.1)`, overflowX: "auto", flexWrap: "nowrap", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", width: "100%" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ background: tab === t.key ? C.rose : "transparent", color: tab === t.key ? C.white : C.text2, border: "none", borderRadius: "10px", fontSize: "0.82rem", fontWeight: 600, padding: "0.5rem 1.1rem", cursor: "pointer", transition: "all .2s", fontFamily: FONT_BODY, display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap", flexShrink: 0 }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── RESUMO ── */}
        {tab === "resumo" && (
          <div>
            <h2 style={S.secTitle}>Resumo Financeiro</h2>
            <div className="fat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              {([
                { label: "Faturamento Hoje",   value: `${fatHoje} €`,   icon: "💰", color: C.roseDeep, bg: C.roseLight },
                { label: "Faturamento Semana", value: `${fatSemana} €`, icon: "📈", color: C.blue,     bg: C.blueBg    },
                { label: "Faturamento Mês",    value: `${fatMes} €`,    icon: "🗓️", color: C.green,    bg: C.greenBg   },
              ] as { label:string; value:string; icon:string; color:string; bg:string }[]).map(({ label, value, icon, color, bg }) => (
                <div key={label} style={{ background: C.white, border: `1px solid ${C.roseMid}`, borderRadius: "16px", padding: "1.25rem 1.4rem", boxShadow: `0 3px 16px rgba(236,168,169,0.1)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <div style={{ background: bg, borderRadius: "10px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" }}>{icon}</div>
                    <span style={{ color: C.text2, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
                  </div>
                  <div style={{ color, fontSize: "1.75rem", fontWeight: 800, fontFamily: FONT_TITLE }}>{value}</div>
                </div>
              ))}
            </div>
            <div className="resumo-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
              {([
                { label:"Total Marcações", value:String(citasAtivas.length),  color:C.blue,  bg:C.blueBg,  icon:"📅" },
                { label:"Concluídas",      value:String(citasConclui.length), color:C.green, bg:C.greenBg, icon:"✅" },
                { label:"Pendentes",       value:String(citasPend.length),    color:C.amber, bg:C.amberBg, icon:"⏳" },
              ] as { label:string; value:string; color:string; bg:string; icon:string }[]).map(({ label, value, color, bg, icon }) => (
                <div key={label} style={{ background: C.white, border: `1px solid ${C.roseMid}`, borderRadius: "14px", padding: "1rem 1.25rem", boxShadow: `0 2px 10px rgba(236,168,169,0.08)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                    <div style={{ background: bg, borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>{icon}</div>
                    <span style={{ color: C.text2, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</span>
                  </div>
                  <div style={{ color, fontSize: "1.6rem", fontWeight: 800, fontFamily: FONT_TITLE }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.white, border: `1px solid ${C.roseMid}`, borderRadius: "16px", padding: "1.4rem 1.5rem", boxShadow: `0 3px 16px rgba(236,168,169,0.1)` }}>
              <h3 style={{ color: C.text, fontWeight: 700, fontSize: "0.95rem", margin: "0 0 1rem", fontFamily: FONT_TITLE }}>Próximas Hoje</h3>
              {citasAtivas.slice(0,6).length === 0
                ? <p style={{ color:C.text3, fontSize:"0.85rem" }}>Sem marcações hoje.</p>
                : citasAtivas.slice(0,6).map(c => {
                    const hora = horaMinDeISO(c.fecha_hora);
                    const cor  = ESTADO_COLOR[c.estado] ?? C.rose;
                    const precoCobrado = extrairPrecoCobrado(c.notas);
                    return (
                      <div key={c.id} style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.6rem 0", borderBottom:`1px solid ${C.roseMid}`, flexWrap:"wrap" }}>
                        <span style={{ color:C.roseDeep, fontWeight:700, fontSize:"0.85rem", minWidth:"42px" }}>{hora}</span>
                        <span style={{ color:C.text, fontSize:"0.85rem", flex:1, fontWeight:500, minWidth:"100px" }}>{c.clientes?.nombre ?? "—"}</span>
                        <span style={{ color:C.text2, fontSize:"0.78rem" }}>{c.servicios?.nombre ?? "—"}</span>
                        <span style={{ color:C.roseDeep, fontSize:"0.8rem", fontWeight:700 }}>
                          {precoCobrado ? `${precoCobrado} €` : `${c.servicios?.precio ?? "—"} €`}
                          {precoCobrado && <span style={{ color:C.amber, fontSize:"0.7rem", marginLeft:"4px" }}>★</span>}
                        </span>
                        <span style={{ color:cor, background:cor+"18", borderRadius:"999px", fontSize:"0.7rem", padding:"2px 10px", fontWeight:600, border:`1px solid ${cor}33` }}>{c.estado}</span>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        )}

        {/* ── CALENDÁRIO ── */}
        {tab === "calendario" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1.5rem", flexWrap:"wrap" }}>
              <h2 style={{ ...S.secTitle, margin:0 }}>Agenda</h2>
              <input type="date" value={diaVer} onChange={e => setDiaVer(e.target.value)} style={{ ...S.inp, width:"auto", padding:"0.45rem 0.8rem", fontSize:"0.85rem" }} />
              <button onClick={fetchCitas} style={{ ...S.btnOut, padding:"0.45rem 0.9rem", fontSize:"0.82rem" }}>↻</button>
              <div style={{ flex:1 }} />
              <button onClick={() => abrirWalkin()} style={{ ...S.btnRose, padding:"0.6rem 1.25rem", fontSize:"0.83rem" }}>+ Nova Marcação</button>
            </div>
            <div style={{ background:C.white, border:`1px solid ${C.roseMid}`, borderRadius:"16px", overflow:"hidden", boxShadow:`0 4px 20px rgba(236,168,169,0.1)` }}>
              {HORAS_AGENDA.map((hora, idx) => {
                const citasNaHora = citas.filter(c => horaDeISO(c.fecha_hora) === hora);
                const vazia       = citasNaHora.length === 0;
                return (
                  <div key={hora} style={{ display:"flex", minHeight:vazia?"58px":"auto", borderBottom:idx < HORAS_AGENDA.length-1 ? `1px solid ${C.roseMid}` : "none" }}>
                    <div style={{ width:"62px", flexShrink:0, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:"14px", borderRight:`1px solid ${C.roseMid}`, background:C.bgAlt }}>
                      <span style={{ color:C.roseDeep, fontWeight:700, fontSize:"0.8rem" }}>{hora}</span>
                    </div>
                    <div style={{ flex:1, padding:vazia?"0":"0.6rem 0.75rem", display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                      {vazia ? (
                        <div className="agenda-slot" onClick={() => abrirWalkin(hora)}
                          style={{ flex:1, display:"flex", alignItems:"center", paddingLeft:"1rem", color:C.text3, fontSize:"0.78rem", transition:"background .15s", minHeight:"58px" }}>
                          <span style={{ opacity:0.5 }}>+ Adicionar marcação</span>
                        </div>
                      ) : (
                        citasNaHora.map(c => {
                          const horaCita     = horaMinDeISO(c.fecha_hora);
                          const cor          = ESTADO_COLOR[c.estado] ?? C.rose;
                          const precoCobrado = extrairPrecoCobrado(c.notas);
                          // Nota limpia sin el tag de precio
                          const notaLimpa    = c.notas ? c.notas.replace(/\[Preço Cobrado:.*?\]/g,"").replace("Walk-in","").trim() : "";
                          return (
                            <div key={c.id} style={{ background:cor+"10", border:`1px solid ${cor}33`, borderLeft:`3px solid ${cor}`, borderRadius:"10px", padding:"0.65rem 0.9rem", display:"flex", alignItems:"center", gap:"0.75rem", flexWrap:"wrap" }}>
                              <span style={{ color:cor, fontWeight:800, fontSize:"0.82rem", minWidth:"38px" }}>{horaCita}</span>
                              <div style={{ flex:1, minWidth:"100px" }}>
                                <div style={{ color:C.text, fontWeight:600, fontSize:"0.88rem" }}>{c.clientes?.nombre ?? "—"}</div>
                                <div style={{ color:C.text2, fontSize:"0.74rem", marginTop:"1px" }}>
                                  {c.servicios?.nombre ?? "—"} ·{" "}
                                  {precoCobrado ? (
                                    <span>
                                      <strong style={{ color:C.amber }}>{precoCobrado} €</strong>
                                      <span style={{ color:C.text3, textDecoration:"line-through", marginLeft:"4px", fontSize:"0.7rem" }}>{c.servicios?.precio} €</span>
                                    </span>
                                  ) : (
                                    <strong style={{ color:C.roseDeep }}>{c.servicios?.precio ?? "—"} €</strong>
                                  )}
                                  {notaLimpa ? ` · ${notaLimpa}` : ""}
                                  {c.notas?.includes("Walk-in") && <span style={{ color:C.text3, fontSize:"0.7rem", marginLeft:"4px" }}>(Walk-in)</span>}
                                </div>
                              </div>
                              <span style={{ color:C.text2, fontSize:"0.75rem" }}>{c.clientes?.telefono ?? ""}</span>
                              <span style={{ color:cor, background:cor+"18", borderRadius:"999px", fontSize:"0.68rem", padding:"2px 9px", fontWeight:600, border:`1px solid ${cor}33` }}>{c.estado}</span>
                              <div style={{ display:"flex", gap:"0.35rem" }}>
                                {c.estado !== "completada" && (
                                  <button onClick={() => marcarEstado(c.id,"completada")} style={{ ...S.mini, background:C.greenBg, color:C.green, border:`1px solid ${C.greenBd}` }}>✓</button>
                                )}
                                {c.estado !== "cancelada" && (
                                  <button onClick={() => marcarEstado(c.id,"cancelada")} style={{ ...S.mini, background:C.redBg, color:C.red, border:`1px solid ${C.redBd}` }}>✕</button>
                                )}
                                {c.clientes?.telefono && (
                                  <a href={`https://wa.me/+${c.clientes.telefono.replace(/\D/g,"")}?text=Olá%20${encodeURIComponent(c.clientes.nombre??"")}!%20Lembramos%20a%20sua%20marcação%20às%20${horaCita}%20na%20Glow%20Esthetic%20✦`}
                                    target="_blank" rel="noreferrer"
                                    style={{ ...S.mini, background:C.greenBg, color:C.green, border:`1px solid ${C.greenBd}`, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>💬</a>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CRM ── */}
        {tab === "crm" && (
          <div>
            <h2 style={S.secTitle}>Clientes ({clientes.length})</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
              {clientes.length === 0
                ? <p style={{ color:C.text2, fontSize:"0.88rem" }}>Sem clientes registados.</p>
                : clientes.map(cl => (
                    <div key={cl.id} style={S.card}>
                      <div style={{ width:"40px", height:"40px", background:C.roseLight, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:C.roseDeep, fontWeight:800, fontSize:"1rem", flexShrink:0, fontFamily:FONT_TITLE }}>
                        {cl.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:"100px" }}>
                        <div style={{ color:C.text, fontWeight:600, fontSize:"0.92rem" }}>{cl.nombre}</div>
                        <div style={{ color:C.text2, fontSize:"0.76rem", marginTop:"2px" }}>{cl.telefono ?? "sem telefone"}</div>
                      </div>
                      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                        <span style={{ color:C.green, background:C.greenBg, border:`1px solid ${C.greenBd}`, borderRadius:"999px", padding:"3px 11px", fontSize:"0.76rem", fontWeight:600 }}>✓ {cl.citas_asistidas}</span>
                        <span style={{ color:C.red,   background:C.redBg,   border:`1px solid ${C.redBd}`,   borderRadius:"999px", padding:"3px 11px", fontSize:"0.76rem", fontWeight:600 }}>✕ {cl.citas_perdidas}</span>
                      </div>
                      {cl.telefono && (
                        <a href={`https://wa.me/+${cl.telefono.replace(/\D/g,"")}?text=Olá%20${encodeURIComponent(cl.nombre)}!%20Não%20se%20esqueça%20da%20sua%20próxima%20marcação%20na%20Glow%20Esthetic%20✦`}
                          target="_blank" rel="noreferrer"
                          style={{ background:C.wa, color:C.white, borderRadius:"9px", padding:"6px 14px", fontSize:"0.78rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"5px", boxShadow:"0 2px 8px rgba(37,211,102,0.3)", whiteSpace:"nowrap" }}>
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ── SERVIÇOS ── */}
        {tab === "servicos" && (
          <div>
            <h2 style={S.secTitle}>Serviços</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
              {servicios.map(sv => (
                <div key={sv.id} style={{ ...S.card, opacity:sv.activo ? 1 : 0.5 }}>
                  <div style={{ flex:1, minWidth:"120px" }}>
                    <div style={{ color:C.text, fontWeight:600, fontSize:"0.92rem" }}>{sv.nombre}</div>
                    <div style={{ color:C.text2, fontSize:"0.76rem", marginTop:"2px" }}>{sv.duracion_minutos} min</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                    <input type="number" value={editPreco[sv.id] ?? sv.precio}
                      onChange={e => setEditPreco(p => ({ ...p, [sv.id]: e.target.value }))}
                      style={{ ...S.inp, width:"85px", padding:"0.45rem 0.6rem", fontSize:"0.85rem", textAlign:"right" }} />
                    <span style={{ color:C.text2, fontSize:"0.82rem", fontWeight:600 }}>€</span>
                    <button onClick={() => guardarPreco(sv.id)} style={{ ...S.mini, background:C.roseLight, color:C.roseDeep, border:`1px solid ${C.roseMid}` }}>✓</button>
                  </div>
                  <button onClick={() => toggleServico(sv.id, sv.activo)}
                    style={{ ...S.mini, padding:"6px 14px", fontSize:"0.78rem", fontWeight:700, background:sv.activo ? C.greenBg : C.redBg, color:sv.activo ? C.green : C.red, border:`1px solid ${sv.activo ? C.greenBd : C.redBd}` }}>
                    {sv.activo ? "Ativo" : "Inativo"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL WALK-IN ── */}
      {modalWalkin && (
        <div style={{ position:"fixed", inset:0, background:"rgba(51,51,51,0.5)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={e => { if (e.target === e.currentTarget) { setModalWalkin(false); setWalkinHora(""); } }}>
          <div style={{ background:C.white, border:`1px solid ${C.roseMid}`, borderRadius:"22px", padding:"2.25rem", width:"100%", maxWidth:"420px", position:"relative", boxShadow:"0 24px 70px rgba(51,51,51,0.18)", maxHeight:"92vh", overflowY:"auto" }}>
            <button onClick={() => { setModalWalkin(false); setWalkinHora(""); }} style={{ position:"absolute", top:"1.25rem", right:"1.25rem", background:C.roseLight, border:"none", color:C.roseDark, cursor:"pointer", borderRadius:"50%", width:"30px", height:"30px", fontSize:"0.9rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            <h3 style={{ fontFamily:FONT_TITLE, color:C.text, margin:"0 0 1.4rem", fontWeight:700, fontSize:"1.2rem" }}>
              Nova Marcação {walkinHora ? `· ${walkinHora}` : "(Walk-in)"}
            </h3>

            <label style={S.lbl}>Nome</label>
            <input style={S.inp} placeholder="Nome do cliente" value={wNome} onChange={e => setWNome(e.target.value)} />

            <label style={S.lbl}>Telefone</label>
            <input style={S.inp} placeholder="+351 …" value={wTelefone} onChange={e => setWTelefone(e.target.value)} />

            <label style={S.lbl}>Serviço</label>
            <select style={S.inp} value={wServicoId} onChange={e => setWServicoId(e.target.value)}>
              <option value="">Escolha…</option>
              {servicios.filter(sv => sv.activo).map(sv => (
                <option key={sv.id} value={sv.id}>{sv.nombre} — {sv.precio} €</option>
              ))}
            </select>

            {/* Precio editable — aparece cuando hay servicio seleccionado */}
            {wServicoId && (
              <>
                <label style={S.lbl}>Preço a cobrar (€)</label>
                <div style={{ position:"relative" }}>
                  <input
                    type="number"
                    style={{ ...S.inp, paddingRight:"2.5rem" }}
                    value={wPreco}
                    onChange={e => setWPreco(e.target.value)}
                    placeholder="Preço…"
                  />
                  {(() => {
                    const sv     = servicios.find(s => s.id === wServicoId);
                    const base   = sv?.precio ?? 0;
                    const atual  = parseFloat(wPreco);
                    if (isNaN(atual) || atual === base) return null;
                    return (
                      <div style={{ marginTop:"4px", background:C.amberBg, border:`1px solid ${C.amber}33`, borderRadius:"8px", padding:"5px 10px", fontSize:"0.75rem", color:C.amber, fontWeight:600, display:"flex", alignItems:"center", gap:"5px" }}>
                        ★ Desconto aplicado — preço base: {base} €
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            <label style={S.lbl}>Hora</label>
            <input type="time" style={S.inp} value={wHora} onChange={e => setWHora(e.target.value)} />

            <button style={{ ...S.btnRose, width:"100%", padding:"0.85rem", marginTop:"1.1rem", fontSize:"0.95rem", boxShadow:`0 6px 20px rgba(236,168,169,0.35)` }} onClick={guardarWalkin}>
              Guardar Marcação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}