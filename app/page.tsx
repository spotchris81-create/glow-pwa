"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── PALETA & TOKENS ─────────────────────────────────────
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
  wa:        "#25D366",
} as const;

const FONT_TITLE = "'Playfair Display', Georgia, serif";
const FONT_BODY  = "'Inter', 'Segoe UI', sans-serif";
const WA_NUM     = "351927459295";
const INSTAGRAM  = "glowesthetic";

// ─── TIPOS ───────────────────────────────────────────────
type Servicio    = { id: string; nombre: string; precio: number; duracion_minutos: number; categoria?: string };
type CitaOcupada = { fecha_hora: string };
type FormState   = { nome: string; telefone: string; servico_id: string; data: string; hora: string };

// ─── HELPERS ─────────────────────────────────────────────
function hojeISO() { return new Date().toISOString().split("T")[0]; }
function gerarHoras() {
  const h: string[] = [];
  for (let i = 9; i <= 19; i++) {
    h.push(`${String(i).padStart(2,"0")}:00`);
    if (i < 19) h.push(`${String(i).padStart(2,"0")}:30`);
  }
  return h;
}
const TODAS_HORAS = gerarHoras();

// ─── CATEGORIAS REAIS DA BD ───────────────────────────────
const TABS_CAT = [
  { key: "Facial",              label: "Rosto"        },
  { key: "Corporal",            label: "Corpo"        },
  { key: "Massagem",            label: "Massagens"    },
  { key: "Estética Avançada",   label: "Avançado"     },
  { key: "Capilar",             label: "Capilar"      },
  { key: "Aparatologia",        label: "Aparatologia" },
];

// ─── IMAGENS POR CATEGORIA ────────────────────────────────
const IMG: Record<string, string> = {
  "Facial":            "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80",
  "Corporal":          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80",
  "Massagem":          "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&q=80",
  "Estética Avançada": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
  "Capilar":           "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
  "Aparatologia":      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80",
  "default":           "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
};

// ─── COPYWRITING PREMIUM ─────────────────────────────────
function getDescricao(nome: string, categoria?: string): string {
  const n = nome.toLowerCase();
  if (n.includes("hidrofacial") || n.includes("hydro"))
    return "Desperte a luminosidade adormecida com este tratamento de vanguarda. Hidratação profunda, remoção de impurezas e renovação celular numa só experiência transformadora.";
  if (n.includes("limpeza") || n.includes("purif"))
    return "Uma purificação ritualística que liberta a pele de toxinas e impurezas, revelando um rosto visivelmente mais radiante, suave e cheio de vida.";
  if (n.includes("peeling"))
    return "Renove a sua pele camada a camada. Um tratamento de renovação celular intensiva que ilumina, suaviza e revela a sua versão mais luminosa.";
  if (n.includes("botox") || n.includes("botulínica"))
    return "Redescubra a suavidade de um rosto descansado e jovial. Uma técnica de precisão que atenua marcas de expressão com resultados naturais e elegantes.";
  if (n.includes("preench") || n.includes("filler"))
    return "Restaure o volume e a definição com precisão artística. Um tratamento que harmoniza, rejuvenesce e realça os traços únicos da sua beleza.";
  if (n.includes("laser"))
    return "Tecnologia laser de última geração para uma pele impecável. Elimine imperfeições, manchas e textura irregular — resultados visíveis desde a primeira sessão.";
  if (n.includes("radiofrequên") || n.includes("radio"))
    return "Estimule o colagénio da sua pele com energia de radiofrequência. Um tratamento de lifting não invasivo que firma, tonifica e rejuvenesce com eficácia comprovada.";
  if (n.includes("massagem") || n.includes("massage"))
    return "Deixe-se envolver por mãos experientes que dissolverão toda a tensão acumulada. Uma jornada sensorial de relaxamento profundo que reconecta corpo e mente.";
  if (n.includes("drenagem"))
    return "Um toque suave e rítmico que ativa a circulação, elimina toxinas e proporciona uma leveza indescritível a cada centímetro do seu corpo.";
  if (n.includes("celulite") || n.includes("anticelul"))
    return "Combata a celulite com uma abordagem terapêutica de alta eficácia. Pele mais lisa, mais firme e mais luminosa, sessão após sessão.";
  if (n.includes("cavitaç") || n.includes("ultrassom"))
    return "Tecnologia ultrassónica que fragmenta células de gordura com precisão. Esculpa silhueta sem cirurgia, com conforto e resultados reais.";
  if (n.includes("capilar") || n.includes("couro") || n.includes("cabelo"))
    return "Um ritual de cuidado profundo para o seu couro cabeludo e cabelo. Nutre, fortalece e devolve o brilho e a vitalidade que merece.";
  if (n.includes("queratina") || n.includes("liso"))
    return "Serenidade absoluta para o seu cabelo. Um tratamento nutritivo que suaviza, alinha e transforma cada fio numa expressão de beleza serena.";

  // Fallback por categoria
  const cat = (categoria ?? "").toLowerCase();
  if (cat.includes("facial"))    return "Um tratamento facial personalizado que respeita a unicidade da sua pele, proporcionando hidratação, luminosidade e uma sensação de bem-estar incomparáveis.";
  if (cat.includes("corporal"))  return "Entregue o seu corpo a um tratamento de cuidado profundo que revitaliza, tonifica e envolve os sentidos numa experiência de luxo puro.";
  if (cat.includes("massagem"))  return "Uma experiência de relaxamento total, onde o toque terapêutico e os aromas envolventes criam um oásis de tranquilidade e bem-estar.";
  if (cat.includes("avançada") || cat.includes("avancada"))
    return "Protocolos estéticos de alta tecnologia reservados a quem exige os melhores resultados. Ciência e sofisticação ao serviço da sua beleza.";
  if (cat.includes("capilar"))   return "Rituais capilares de excelência, formulados para transformar o seu cabelo numa expressão máxima de saúde e beleza.";
  if (cat.includes("aparatol"))  return "Equipamentos de última geração aliados a protocolos clínicos rigorosos, para resultados estéticos de referência e duradouros.";
  return "Uma experiência de bem-estar criada exclusivamente para si — porque a sua beleza merece um cuidado verdadeiramente especial.";
}

// ─── ESTILOS BASE ────────────────────────────────────────
const S = {
  btnRose: {
    background: C.rose, color: C.white, border: "none",
    borderRadius: "30px", fontWeight: 600, cursor: "pointer",
    fontFamily: FONT_BODY, letterSpacing: "0.03em",
  } as React.CSSProperties,
  btnGhost: {
    background: "transparent", color: C.roseDark,
    border: `1.5px solid ${C.rose}`, borderRadius: "30px",
    fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY,
    textDecoration: "none", display: "inline-flex",
    alignItems: "center", justifyContent: "center",
  } as React.CSSProperties,
  lbl: {
    color: C.text2, fontSize: "0.72rem", letterSpacing: "0.1em",
    textTransform: "uppercase" as const, marginBottom: "5px",
    display: "block", marginTop: "0.8rem", fontFamily: FONT_BODY,
  } as React.CSSProperties,
  inp: {
    width: "100%", background: C.bgAlt,
    border: `1.5px solid ${C.roseMid}`, borderRadius: "12px",
    color: C.text, fontSize: "0.9rem", padding: "0.7rem 0.9rem",
    outline: "none", boxSizing: "border-box" as const,
    fontFamily: FONT_BODY, colorScheme: "light" as const,
    marginBottom: "0.1rem",
  } as React.CSSProperties,
};

const FAQ = [
  { q: "Como posso marcar uma consulta?", a: "Pode marcar diretamente neste site, pelo WhatsApp ou por telefone. Após submeter o formulário, a nossa equipa entrará em contacto para confirmar a disponibilidade." },
  { q: "Qual é a política de cancelamento?", a: "Pedimos que nos avise com pelo menos 24 horas de antecedência em caso de cancelamento ou remarcação, para podermos disponibilizar o horário a outros clientes." },
  { q: "Os tratamentos são adequados para todos os tipos de pele?", a: "Sim! Adaptamos todos os tratamentos ao seu tipo de pele específico. Na primeira consulta realizamos uma análise completa para personalizar a sua experiência." },
  { q: "Quanto tempo dura cada tratamento?", a: "A duração varia consoante o serviço, entre 45 minutos e 2 horas. Pode consultar a duração de cada tratamento no catálogo de serviços." },
];

// ─── COMPONENTE PRINCIPAL ────────────────────────────────
export default function ClientePage() {
  const [servicios,   setServicios]   = useState<Servicio[]>([]);
  const [ocupadas,    setOcupadas]    = useState<string[]>([]);
  const [form,        setForm]        = useState<FormState>({ nome: "", telefone: "", servico_id: "", data: hojeISO(), hora: "" });
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [erro,        setErro]        = useState<string | null>(null);
  const [modal,       setModal]       = useState(false);
  const [tabCat,      setTabCat]      = useState("Facial");
  const [faqOpen,     setFaqOpen]     = useState<number | null>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setTimeout(() => setHeroVisible(true), 100); }, []);

  // Canvas partículas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: { x: number; y: number; r: number; dx: number; dy: number; alpha: number }[] = [];
    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * (canvas.width  || 800),
        y: Math.random() * (canvas.height || 600),
        r: Math.random() * 2.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: -Math.random() * 0.4 - 0.1,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,168,169,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5 || p.x > canvas.width + 5) p.dx *= -1;
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  // Servicios activos
  useEffect(() => {
    supabase.from("servicios").select("id, nombre, precio, duracion_minutos, categoria").eq("activo", true)
      .then(({ data }) => { if (data) setServicios(data); });
  }, []);

  // Horas ocupadas
  useEffect(() => {
    if (!form.data) return;
    const ini = new Date(`${form.data}T00:00:00`).toISOString();
    const fim = new Date(`${form.data}T23:59:59`).toISOString();
    supabase.from("citas").select("fecha_hora")
      .gte("fecha_hora", ini).lte("fecha_hora", fim).neq("estado", "cancelada")
      .then(({ data }) => {
        if (data) setOcupadas((data as CitaOcupada[]).map(c => {
          const d = new Date(c.fecha_hora);
          return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
        }));
      });
  }, [form.data]);

  function campo(f: keyof FormState, v: string) { setForm(p => ({ ...p, [f]: v })); setErro(null); }

  function abrirModal(servico_id?: string) {
    if (servico_id) setForm(p => ({ ...p, servico_id }));
    setSuccess(false); setErro(null); setModal(true); setMenuOpen(false);
  }

  function fecharModal() { setModal(false); setSuccess(false); setErro(null); }

  async function reservar() {
    const { nome, telefone, servico_id, data, hora } = form;
    if (!nome || !telefone || !servico_id || !data || !hora) { setErro("Preencha todos os campos."); return; }
    setLoading(true); setErro(null);
    let cliente_id: string;
    const { data: ex } = await supabase.from("clientes").select("id").eq("telefono", telefone).single();
    if (ex) {
      cliente_id = ex.id;
    } else {
      const { data: nv, error: e } = await supabase.from("clientes")
        .insert({ nombre: nome, telefono: telefone }).select("id").single();
      if (e || !nv) { setErro("Erro ao registar cliente."); setLoading(false); return; }
      cliente_id = nv.id;
    }
    const fecha_hora = new Date(`${data}T${hora}:00`).toISOString();
    const { error: ce } = await supabase.from("citas")
      .insert({ cliente_id, servicio_id: servico_id, fecha_hora, estado: "pendiente" });
    if (ce) setErro("Erro ao guardar marcação.");
    else { setSuccess(true); setForm({ nome: "", telefone: "", servico_id: "", data: hojeISO(), hora: "" }); }
    setLoading(false);
  }

  // Filtro exacto por categoría
  const serviciosFiltrados = servicios.filter(sv =>
    (sv.categoria ?? "").trim() === tabCat
  );
  const servicoSel = servicios.find(s => s.id === form.servico_id);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: FONT_BODY }}>

      {/* ── FONTS + CSS GLOBAL ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.rose}; border-radius: 3px; }
        .svc-card { transition: transform .25s ease, box-shadow .25s ease !important; }
        .svc-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 40px rgba(236,168,169,0.28) !important; }
        .tab-pill { transition: all .2s ease !important; }
        .tab-pill:hover { background: ${C.roseMid} !important; }
        .wa-btn:hover { transform: scale(1.1) !important; }
        @media (max-width: 640px) {
          .nav-links { display: none !important; }
          .nav-menu-btn { display: flex !important; }
          .hero-btns { flex-direction: column !important; align-items: center !important; }
          .hero-pills { gap: 1rem !important; }
          .tabs-scroll { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
          .tabs-scroll::-webkit-scrollbar { height: 0; }
          .hora-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .footer-links { flex-direction: column !important; gap: 0.75rem !important; }
        }
        @media (min-width: 641px) {
          .nav-menu-btn { display: none !important; }
          .mobile-menu { display: none !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: "rgba(255,245,247,0.95)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid ${C.roseMid}`, position: "sticky", top: 0, zIndex: 100, boxShadow: `0 2px 20px rgba(236,168,169,0.12)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", height: "64px", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ color: C.rose, fontWeight: 700, fontSize: "1.4rem", fontFamily: FONT_TITLE, letterSpacing: "0.05em" }}>Glow</span>
            <span style={{ color: C.text2, fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>Esthetic</span>
          </div>
          {/* Desktop links */}
          <div className="nav-links" style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <a href="#servicos" style={{ color: C.text2, fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>Serviços</a>
            <a href="#faq"      style={{ color: C.text2, fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>FAQ</a>
            <a href="#contacto" style={{ color: C.text2, fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>Contacto</a>
            <a href="/admin" style={{ color: C.text2, fontSize: "0.82rem", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${C.roseMid}`, borderRadius: "20px", padding: "4px 12px" }}>🔒 Equipa</a>
            <button onClick={() => abrirModal()} style={{ ...S.btnRose, padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}>Marcar Agora</button>
          </div>
          {/* Mobile hamburger */}
          <button className="nav-menu-btn"
            style={{ background: "none", border: "none", cursor: "pointer", display: "none", flexDirection: "column", gap: "5px", padding: "4px" }}
            onClick={() => setMenuOpen(v => !v)}>
            {[0,1,2].map(i => <span key={i} style={{ display: "block", width: "24px", height: "2px", background: C.roseDark, borderRadius: "2px", transition: "all .2s" }} />)}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="mobile-menu" style={{ background: C.white, borderTop: `1px solid ${C.roseMid}`, padding: "1rem 1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <a href="#servicos" onClick={() => setMenuOpen(false)} style={{ color: C.text, fontSize: "0.95rem", textDecoration: "none", fontWeight: 500, padding: "0.4rem 0", borderBottom: `1px solid ${C.roseMid}` }}>Serviços</a>
            <a href="#faq"      onClick={() => setMenuOpen(false)} style={{ color: C.text, fontSize: "0.95rem", textDecoration: "none", fontWeight: 500, padding: "0.4rem 0", borderBottom: `1px solid ${C.roseMid}` }}>FAQ</a>
            <a href="#contacto" onClick={() => setMenuOpen(false)} style={{ color: C.text, fontSize: "0.95rem", textDecoration: "none", fontWeight: 500, padding: "0.4rem 0", borderBottom: `1px solid ${C.roseMid}` }}>Contacto</a>
            <a href="/admin" style={{ color: C.text2, fontSize: "0.88rem", textDecoration: "none", fontWeight: 500, padding: "0.4rem 0", borderBottom: `1px solid ${C.roseMid}`, display: "flex", alignItems: "center", gap: "6px" }}>🔒 Acesso Equipa</a>
            <button onClick={() => abrirModal()} style={{ ...S.btnRose, padding: "0.75rem", fontSize: "0.95rem", marginTop: "0.25rem" }}>Marcar Agora</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "4rem 1.5rem 6rem", overflow: "hidden", background: `linear-gradient(155deg, #fff0f1 0%, #fce4e4 40%, #f8d0d0 100%)` }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url("https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1400&q=55")`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.07 }} />
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: "680px", width: "100%", opacity: heroVisible ? 1 : 0, transition: "opacity 0.9s ease, transform 0.9s ease", transform: heroVisible ? "translateY(0)" : "translateY(24px)" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", color: C.roseDeep, fontSize: "0.7rem", letterSpacing: "0.28em", textTransform: "uppercase", padding: "7px 22px", borderRadius: "999px", marginBottom: "1.75rem", border: `1px solid ${C.roseMid}`, fontWeight: 600 }}>
            Centro de Estética · Lisboa
          </div>
          <h1 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(2.2rem, 6.5vw, 5rem)", fontWeight: 700, color: C.text, lineHeight: 1.08, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
            A arte de <em style={{ color: C.rose, fontStyle: "italic" }}>cuidar</em><br />a sua beleza
          </h1>
          <p style={{ color: C.text2, fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)", lineHeight: 1.75, marginBottom: "0.75rem", fontWeight: 300 }}>
            Experiências de bem-estar desde <strong style={{ color: C.roseDeep, fontWeight: 600 }}>35€</strong>
          </p>
          <p style={{ color: C.text3, fontSize: "0.88rem", marginBottom: "2.5rem" }}>Rua Rodrigues Sampaio 146, Lisboa</p>
          <div className="hero-btns" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => abrirModal()} style={{ ...S.btnRose, padding: "1rem 2.5rem", fontSize: "1rem", boxShadow: `0 8px 28px rgba(236,168,169,0.45)` }}>Reservar Experiência</button>
            <a href="#servicos" style={{ ...S.btnGhost, padding: "1rem 2.5rem", fontSize: "1rem" }}>Ver Serviços</a>
          </div>
          <div className="hero-pills" style={{ display: "flex", gap: "2rem", marginTop: "3rem", flexWrap: "wrap", justifyContent: "center" }}>
            {[["Facial","Luminosidade renovada"],["Massagem","Relaxamento profundo"],["Avançado","Tecnologia de ponta"]].map(([t, sub]) => (
              <div key={t} style={{ textAlign: "center" }}>
                <div style={{ color: C.roseDeep, fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: "3px" }}>{t}</div>
                <div style={{ color: C.text2, fontSize: "0.76rem" }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: "100%", height: "70px", display: "block" }}>
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill={C.bg} />
          </svg>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <section id="servicos" style={{ padding: "5rem 1.5rem", maxWidth: "1060px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2.75rem" }}>
          <p style={{ color: C.rose, fontSize: "0.72rem", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.6rem" }}>Os Nossos Tratamentos</p>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(1.7rem, 4vw, 2.8rem)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Cuide da sua pele</h2>
          <p style={{ color: C.text2, fontSize: "0.95rem", marginTop: "0.75rem" }}>Escolha o tratamento ideal para si</p>
        </div>

        {/* Tabs — scroll horizontal em mobile */}
        <div className="tabs-scroll" style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
          {TABS_CAT.map(t => (
            <button key={t.key} className="tab-pill" onClick={() => setTabCat(t.key)}
              style={{ background: tabCat === t.key ? C.rose : C.white, color: tabCat === t.key ? C.white : C.text2, border: `1.5px solid ${tabCat === t.key ? C.rose : C.roseMid}`, borderRadius: "30px", padding: "0.5rem 1.35rem", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT_BODY }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tarjetas */}
        {serviciosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.text2 }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
            <p style={{ fontFamily: FONT_TITLE, fontSize: "1.1rem", color: C.roseDark, marginBottom: "0.5rem" }}>Em breve disponível</p>
            <p style={{ fontSize: "0.88rem" }}>Estamos a preparar tratamentos incríveis para esta categoria.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.75rem" }}>
            {serviciosFiltrados.map(sv => (
              <div key={sv.id} className="svc-card"
                style={{ background: C.white, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(236,168,169,0.13)", border: `1px solid ${C.roseMid}` }}>
                <div style={{ height: "190px", overflow: "hidden", position: "relative" }}>
                  <img
                    src={IMG[sv.categoria ?? ""] ?? IMG["default"]}
                    alt={sv.nombre}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(6px)", borderRadius: "999px", padding: "4px 12px", fontSize: "0.7rem", color: C.roseDeep, fontWeight: 600 }}>
                    {sv.duracion_minutos} min
                  </div>
                </div>
                <div style={{ padding: "1.4rem 1.5rem 1.6rem" }}>
                  <h3 style={{ fontFamily: FONT_TITLE, fontSize: "1.05rem", fontWeight: 700, color: C.text, marginBottom: "0.5rem" }}>{sv.nombre}</h3>
                  <p style={{ color: C.text2, fontSize: "0.82rem", lineHeight: 1.68, marginBottom: "1.25rem" }}>
                    {getDescricao(sv.nombre, sv.categoria)}
                  </p>
                  <button onClick={() => abrirModal(sv.id)} style={{ ...S.btnRose, width: "100%", padding: "0.72rem", fontSize: "0.85rem" }}>
                    Reservar Experiência
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: C.white, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p style={{ color: C.rose, fontSize: "0.72rem", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.6rem" }}>Dúvidas Frequentes</p>
            <h2 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 700, color: C.text }}>Perguntas & Respostas</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ background: C.bg, border: `1px solid ${C.roseMid}`, borderRadius: "14px", overflow: "hidden" }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{ width: "100%", background: "none", border: "none", padding: "1.1rem 1.4rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: FONT_BODY, fontSize: "0.92rem", fontWeight: 600, color: C.text, textAlign: "left" as const, gap: "0.5rem" }}>
                  <span>{f.q}</span>
                  <span style={{ color: C.rose, fontSize: "1.3rem", transform: faqOpen === i ? "rotate(45deg)" : "rotate(0)", transition: "transform .3s", flexShrink: 0 }}>+</span>
                </button>
                {faqOpen === i && (
                  <div style={{ padding: "0 1.4rem 1.2rem", color: C.text2, fontSize: "0.87rem", lineHeight: 1.72 }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" style={{ background: C.bg, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p style={{ color: C.rose, fontSize: "0.72rem", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.6rem" }}>Visite-nos</p>
            <h2 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 700, color: C.text }}>Contacto & Localização</h2>
          </div>
          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {([
                ["📍","Morada","Rua Rodrigues Sampaio 146 1ºesq\n1150-282 Lisboa",null],
                ["📞","Telefone","+351 927 459 295","tel:+351927459295"],
                ["✉️","Email","glowestheticportugal@gmail.com","mailto:glowestheticportugal@gmail.com"],
                ["📸","Instagram",`@${INSTAGRAM}`,`https://instagram.com/${INSTAGRAM}`],
              ] as [string,string,string,string|null][]).map(([icon,label,value,href]) => (
                <div key={label} style={{ background: C.white, border: `1px solid ${C.roseMid}`, borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start", boxShadow: "0 2px 12px rgba(236,168,169,0.07)" }}>
                  <span style={{ fontSize: "1.2rem", marginTop: "1px" }}>{icon}</span>
                  <div>
                    <div style={{ color: C.text3, fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 600 }}>{label}</div>
                    {href
                      ? <a href={href} target="_blank" rel="noreferrer" style={{ color: C.roseDeep, fontSize: "0.9rem", textDecoration: "none", fontWeight: 500 }}>{value}</a>
                      : <div style={{ color: C.text, fontSize: "0.9rem", whiteSpace: "pre-line" }}>{value}</div>
                    }
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderRadius: "20px", overflow: "hidden", border: `1px solid ${C.roseMid}`, boxShadow: "0 4px 24px rgba(236,168,169,0.14)", minHeight: "320px" }}>
              <iframe
                title="Localização Glow"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3113.0!2d-9.1435!3d38.7195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzjCsDQzJzEwLjIiTiA5wrAwOCczNi42Ilc!5e0!3m2!1spt!2spt!4v1"
                width="100%" height="100%"
                style={{ border: 0, display: "block", minHeight: "320px" }}
                allowFullScreen loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: `linear-gradient(135deg, #fce4e4 0%, ${C.roseLight} 100%)`, borderTop: `1px solid ${C.roseMid}`, padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <span style={{ fontFamily: FONT_TITLE, color: C.rose, fontWeight: 700, fontSize: "1.4rem", letterSpacing: "0.05em" }}>Glow Esthetic</span>
        <p style={{ color: C.text2, fontSize: "0.78rem", marginTop: "0.5rem" }}>Rua Rodrigues Sampaio 146, Lisboa · +351 927 459 295</p>
        <div className="footer-links" style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
          <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer" style={{ color: C.roseDeep, fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>Instagram</a>
          <a href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noreferrer" style={{ color: C.green, fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>WhatsApp</a>
        </div>
        <p style={{ color: C.text3, fontSize: "0.7rem", marginTop: "1rem" }}>© {new Date().getFullYear()} Glow Esthetic. Todos os direitos reservados.</p>
        {/* Botão admin — subtil mas visível */}
        <a href="/admin"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "1.25rem", color: C.text2, fontSize: "0.78rem", textDecoration: "none", fontWeight: 500, background: "rgba(255,255,255,0.6)", border: `1px solid ${C.roseMid}`, borderRadius: "20px", padding: "5px 14px", backdropFilter: "blur(4px)", letterSpacing: "0.03em" }}>
          🔒 Acesso Equipa
        </a>
      </footer>

      {/* ── WHATSAPP FLOTANTE ── */}
      <a href={`https://wa.me/${WA_NUM}?text=Olá!%20Gostaria%20de%20marcar%20uma%20consulta.`}
        target="_blank" rel="noreferrer" className="wa-btn"
        style={{ position: "fixed", bottom: "1.75rem", right: "1.75rem", zIndex: 300, background: C.wa, borderRadius: "50%", width: "58px", height: "58px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 24px rgba(37,211,102,0.45)`, textDecoration: "none", transition: "transform .2s" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* ── MODAL RESERVA ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(51,51,51,0.55)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div style={{ background: C.white, borderRadius: "24px", padding: "2.25rem", width: "100%", maxWidth: "500px", maxHeight: "94vh", overflowY: "auto", position: "relative", boxShadow: "0 24px 70px rgba(51,51,51,0.2)" }}>
            <button onClick={fecharModal} style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: C.roseLight, border: "none", color: C.roseDark, fontSize: "1rem", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>

            {success ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ width: "64px", height: "64px", background: C.roseLight, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.6rem", color: C.rose }}>✦</div>
                <h2 style={{ fontFamily: FONT_TITLE, color: C.text, margin: "0 0 0.6rem", fontWeight: 700, fontSize: "1.5rem" }}>Marcação Enviada!</h2>
                <p style={{ color: C.text2, fontSize: "0.9rem", lineHeight: 1.65, maxWidth: "320px", margin: "0 auto 1.75rem" }}>
                  A nossa equipa confirmará a disponibilidade e detalhes em breve.
                </p>
                <button style={{ ...S.btnRose, padding: "0.8rem 2rem" }} onClick={fecharModal}>Fechar</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: FONT_TITLE, color: C.text, fontWeight: 700, fontSize: "1.4rem", margin: "0 0 0.4rem" }}>Reservar Experiência</h2>
                <p style={{ color: C.text2, fontSize: "0.82rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                  A nossa equipa confirmará a disponibilidade e os detalhes.
                </p>

                <label style={S.lbl}>Nome</label>
                <input style={S.inp} placeholder="O seu nome completo" value={form.nome} onChange={e => campo("nome", e.target.value)} />

                <label style={S.lbl}>Telefone</label>
                <input style={S.inp} placeholder="+351 900 000 000" value={form.telefone} onChange={e => campo("telefone", e.target.value)} />

                <label style={S.lbl}>Tratamento</label>
                <select style={S.inp} value={form.servico_id} onChange={e => campo("servico_id", e.target.value)}>
                  <option value="">Escolha um tratamento…</option>
                  {servicios.map(sv => (
                    <option key={sv.id} value={sv.id}>{sv.nombre} ({sv.duracion_minutos} min)</option>
                  ))}
                </select>

                {servicoSel && (
                  <div style={{ background: C.roseLight, border: `1px solid ${C.roseMid}`, borderRadius: "10px", padding: "0.65rem 1rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: C.rose }}>✦</span>
                    <span style={{ color: C.roseDeep, fontSize: "0.85rem", fontWeight: 600 }}>{servicoSel.nombre}</span>
                    <span style={{ color: C.text2, fontSize: "0.78rem", marginLeft: "auto" }}>{servicoSel.duracion_minutos} min</span>
                  </div>
                )}

                <label style={S.lbl}>Data</label>
                <input type="date" style={S.inp} value={form.data} min={hojeISO()} onChange={e => campo("data", e.target.value)} />

                <label style={S.lbl}>Hora disponível</label>
                <div className="hora-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.45rem", margin: "0.4rem 0 1rem" }}>
                  {TODAS_HORAS.map(h => {
                    const ocup = ocupadas.includes(h);
                    const sel  = form.hora === h;
                    return (
                      <button key={h} disabled={ocup} onClick={() => !ocup && campo("hora", h)}
                        style={{ padding: "0.5rem", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, cursor: ocup ? "not-allowed" : "pointer", background: sel ? C.rose : ocup ? "#f5f5f5" : C.white, color: sel ? C.white : ocup ? "#ccc" : C.text2, border: sel ? `1.5px solid ${C.rose}` : `1px solid ${C.roseMid}`, textDecoration: ocup ? "line-through" : "none", transition: "all .15s", fontFamily: FONT_BODY }}>
                        {h}
                      </button>
                    );
                  })}
                </div>

                {erro && <p style={{ color: "#e05555", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{erro}</p>}

                <button
                  style={{ ...S.btnRose, width: "100%", padding: "0.95rem", fontSize: "0.95rem", opacity: loading ? 0.65 : 1, boxShadow: `0 6px 20px rgba(236,168,169,0.4)` }}
                  onClick={reservar} disabled={loading}>
                  {loading ? "A enviar…" : "✦ Confirmar Marcação"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}