"use client";

import { useEffect, useState, useRef } from "react";
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
  wa:        "#25D366",
} as const;

const FONT_TITLE = "'Playfair Display', Georgia, serif";
const FONT_BODY  = "'Inter', 'Segoe UI', sans-serif";
const WA_NUM     = "351927459295";
const INSTAGRAM  = "_glowesthetic_";
const INSTAGRAM_URL = "https://www.instagram.com/_glowesthetic_?utm_source=qr&igsh=MXF3NGtvZTM1a2c3bg==";

// ─── TIPOS ───────────────────────────────────────────────
type Servicio    = { id: string; nombre: string; precio: number; duracion_minutos: number; categoria?: string };
type CitaOcupada = { fecha_hora: string };
type FormState   = { nome: string; telefone: string; servico_id: string; data: string; hora: string };

// ─── HELPERS ─────────────────────────────────────────────
function hojeISO() { return new Date().toISOString().split("T")[0]; }

function gerarHoras(): string[] {
  const h: string[] = [];
  for (let i = 11; i <= 19; i++) {
    h.push(`${String(i).padStart(2,"0")}:00`);
    if (i < 19) h.push(`${String(i).padStart(2,"0")}:30`);
  }
  return h;
}
const TODAS_HORAS = gerarHoras();

function slotsOcupados(citaISO: string, duracao: number): string[] {
  const slots: string[] = [];
  const base = new Date(citaISO);
  const n    = Math.ceil(duracao / 30);
  for (let i = 0; i < n; i++) {
    const t = new Date(base.getTime() + i * 30 * 60000);
    slots.push(`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`);
  }
  return slots;
}

function horasPasadas(): string[] {
  const now    = new Date();
  const hAtual = now.getHours();
  const mAtual = now.getMinutes();
  return TODAS_HORAS.filter(h => {
    const [hh, mm] = h.split(":").map(Number);
    return hh < hAtual || (hh === hAtual && mm <= mAtual);
  });
}

function horasBloqueadasPorDuracao(ocupadas: string[], duracao: number): string[] {
  const slots = Math.ceil(duracao / 30);
  const bloq  = new Set<string>();
  TODAS_HORAS.forEach(hora => {
    const [hh, mm] = hora.split(":").map(Number);
    const base     = new Date(2000, 0, 1, hh, mm);
    for (let i = 0; i < slots; i++) {
      const t  = new Date(base.getTime() + i * 30 * 60000);
      const ts = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
      if (ocupadas.includes(ts)) { bloq.add(hora); break; }
    }
  });
  return Array.from(bloq);
}

// ─── IMAGENS POR PALAVRA-CHAVE ────────────────────────────
const KW_IMGS: { keys: string[]; url: string }[] = [
  // Serviços existentes
  { keys: ["skin","booster","hidratação","hidratacao"],                 url: "/images/skin-boosters.jpg"          },
  { keys: ["capilar","cabelo","dermapen"],                              url: "/images/capilar.jpg"                },
  { keys: ["limpeza","pele"],                                           url: "/images/limpeza.jpg"                },
  { keys: ["glow","lips","lábios","labios"],                            url: "/images/glow-lips.jpg"              },
  { keys: ["acne","borbulhas"],                                         url: "/images/acne.jpg"                   },
  { keys: ["led","terapia","rejuvenescimento"],                         url: "/images/led.jpg"                    },
  { keys: ["depilação","depilacao","laser"],                            url: "/images/laser.jpg"                  },
  { keys: ["relaxante"],                                                url: "/images/relaxante.jpg"              },
  { keys: ["drenagem","linfática","linfatica"],                         url: "/images/relaxante.jpg"              },
  { keys: ["modeladora","redutora"],                                    url: "/images/modeladora.jpg"             },
  { keys: ["remoção tatuagem","remocao tatuagem","tattoo","tatuagem"],  url: "/images/remocao-tatuagem.jpg"       },
  { keys: ["remoção sobrancelha","remocao sobrancelha","sobrancelha"],  url: "/images/remocao-sobrancelha.jpg"    },
  // Novos serviços
  { keys: ["presso","pressoterapia"],                                   url: "/images/pressoterapia.jpg"          },
  { keys: ["radiofrequência","radiofrequencia","rf"],                   url: "/images/radiofrequencia.jpg"        },
  { keys: ["grávida","gravida","gestante","pré-parto","pre-parto"],     url: "/images/massagem-gravidas.jpg"      },
  { keys: ["desportiva","desporto","atleta"],                           url: "/images/massagem-desportiva.jpg"    },
  { keys: ["pós-operatória","pos-operatoria","cirurgia"],               url: "/images/massagem-pos-operatoria.jpg"},
];
const IMG_DEFAULT = "/images/skin-boosters.jpg";

function getImagem(nome: string): string {
  const n = nome.toLowerCase();
  // Combinações compostas — testar primeiro
  if (n.includes("remoção") || n.includes("remocao")) {
    if (n.includes("sobrancelha")) return "/images/remocao-sobrancelha.jpg";
    if (n.includes("tatuagem") || n.includes("tattoo")) return "/images/remocao-tatuagem.jpg";
  }
  for (const { keys, url } of KW_IMGS) {
    if (keys.some(k => n.includes(k))) return url;
  }
  return IMG_DEFAULT;
}

// ─── DESCRIÇÕES EXATAS ────────────────────────────────────
function getDescricao(nome: string): string {
  const n = nome.toLowerCase();

  // ── Serviços existentes ──
  if (["skin","booster","hidratação","hidratacao"].some(k => n.includes(k)))
    return "A hidratação profunda da pele é essencial para preservar a sua luminosidade, elasticidade e aparência saudável. Os tratamentos com Skin Boosters atuam nas camadas profundas da pele, melhorando a hidratação e a firmeza. Este tratamento é especialmente indicado para: Linhas finas e rugas superficiais; Pele desidratada ou opaca; Perda de elasticidade. Com resultados progressivos e naturais, os Skin Boosters devolvem à pele um aspeto mais fresco e revitalizado.";

  if (["capilar","cabelo","dermapen"].some(k => n.includes(k)))
    return "Recupere a vitalidade, densidade e qualidade do seu cabelo com tratamentos capilares avançados. Utilizamos técnicas como PRP, Microagulhamento, Exossomas e Polinucleótidos para estimular o crescimento, fortalecer a raiz e melhorar a oxigenação celular do couro cabeludo. Indicado para afinamento capilar, queda em fase inicial e perda de densidade.";

  if (["limpeza","pele"].some(k => n.includes(k)))
    return "A limpeza de pele é um tratamento essencial para manter a pele saudável, equilibrada e luminosa. Remove impurezas, células mortas e pontos negros. O tratamento inclui higienização profunda, esfoliação suave, extração cuidadosa e hidratação. Promove uma pele mais limpa, previne imperfeições e melhora a textura natural.";

  if (["glow","lips","lábios","labios"].some(k => n.includes(k)))
    return "Lábios hidratados, luminosos e naturalmente irresistíveis. O tratamento Glow Lips realça a beleza natural dos teus lábios, proporcionando hidratação profunda, brilho saudável e um efeito suave e volumoso. Com ingredientes nutritivos e acabamento glow, os teus lábios ficam revitalizados e macios.";

  if (["acne","borbulhas"].some(k => n.includes(k)))
    return "Cuida da tua pele com um tratamento especializado para reduzir a acne, controlar a oleosidade e melhorar a textura da pele. Ajuda a combater borbulhas, marcas e inflamações. Reduz a vermelhidão, previne novas imperfeições e promove uma pele mais uniforme e luminosa.";

  if (["led","terapia","rejuvenescimento"].some(k => n.includes(k)))
    return "Revitaliza a tua pele com a tecnologia LED Terapia, um tratamento não invasivo que estimula a regeneração celular. A luz LED atua em profundidade para estimular a produção de colagénio, reduzir linhas finas e melhorar a firmeza e elasticidade, proporcionando um aspeto mais jovem e saudável sem dor.";

  if (["depilação","depilacao","laser"].some(k => n.includes(k)))
    return "A depilação a laser é um método de depilação progressiva definitiva que utiliza a luz para destruir o pelo direto na raiz. Fim da foliculite, clareamento da pele e resultados duradouros.";

  if (n.includes("relaxante"))
    return "Renove as suas energias e cuide do seu bem-estar com a nossa Massagem Relaxante. Um momento perfeito para aliviar o stress, relaxar o corpo e equilibrar a mente.";

  if (["drenagem","linfática","linfatica"].some(k => n.includes(k)))
    return "Cuide do seu corpo e sinta-se mais leve. Ajuda a eliminar toxinas, reduzir o inchaço e a retenção de líquidos, contribuindo para a redução da celulite e promovendo bem-estar.";

  if (["modeladora","redutora"].some(k => n.includes(k)))
    return "Combina manobras vigorosas e técnicas de drenagem que ativam a circulação, eliminam toxinas e modelam as tuas curvas de forma imediata. Reduz o volume abdominal e combate a celulite.";

  // Remoções compostas — verificar antes das genéricas
  if (n.includes("remoção") || n.includes("remocao")) {
    if (n.includes("sobrancelha"))
      return "Remoção segura e eficaz de pigmentos antigos na zona das sobrancelhas utilizando tecnologia avançada.";
    if (n.includes("tatuagem") || n.includes("tattoo"))
      return "Procedimento estético que utiliza tecnologia a laser para fragmentar e eliminar os pigmentos de tinta introduzidos na camada da derme da pele de forma segura.";
  }

  // ── Novos serviços ──
  if (["presso","pressoterapia"].some(k => n.includes(k)))
    return "A Pressoterapia é um tratamento estético e terapêutico que utiliza pressão de ar controlada através de botas, cintas ou mangas especiais para estimular a circulação sanguínea e linfática. Ajuda o corpo a eliminar toxinas, reduzir o inchaço e melhorar a sensação de pernas cansadas, proporcionando bem-estar e leveza.";

  if (["radiofrequência","radiofrequencia"," rf"].some(k => n.includes(k)))
    return "Tratamento estético não invasivo que utiliza ondas de radiofrequência para aquecer as camadas profundas da pele, estimulando a produção de colagénio e elastina. Ajuda a melhorar a firmeza da pele, reduzir a flacidez e proporcionar um aspeto mais jovem e tonificado.";

  if (["grávida","gravida","gestante","pré-parto","pre-parto"].some(k => n.includes(k)))
    return "Tratamento suave e relaxante especialmente desenvolvido para proporcionar conforto e bem-estar durante a gravidez. Com técnicas adaptadas, ajuda a aliviar as tensões físicas e emocionais desta fase tão especial.";

  if (["desportiva","desporto","atleta"].some(k => n.includes(k)))
    return "Técnica especializada indicada para atletas e pessoas fisicamente ativas, ajudando na recuperação muscular, prevenção de lesões e melhoria do desempenho físico. Atua diretamente nos músculos mais exigidos pelo esforço físico, proporcionando alívio e recuperação.";

  if (["pós-operatória","pos-operatoria","cirurgia"].some(k => n.includes(k)))
    return "Tratamento especializado indicado para auxiliar na recuperação após cirurgias estéticas ou procedimentos cirúrgicos. Realizada com técnicas suaves e cuidadosas, ajuda a reduzir o inchaço, melhorar a circulação e acelerar o processo de recuperação.";

  return "Uma experiência de bem-estar criada exclusivamente para si — porque a sua beleza merece um cuidado verdadeiramente especial.";
}

// ─── CATEGORIAS ───────────────────────────────────────────
const TABS_CAT = [
  { key: "Facial",            label: "Rosto"        },
  { key: "Corporal",          label: "Corpo"        },
  { key: "Massagem",          label: "Massagens"    },
  { key: "Estética Avançada", label: "Avançado"     },
  { key: "Capilar",           label: "Capilar"      },
  { key: "Aparatologia",      label: "Aparatologia" },
];

const FAQ = [
  { q: "Como posso marcar uma consulta?",                            a: "Pode marcar diretamente neste site, pelo WhatsApp ou por telefone. Após submeter o formulário, a nossa equipa entrará em contacto para confirmar a disponibilidade." },
  { q: "Qual é a política de cancelamento?",                        a: "Pedimos que nos avise com pelo menos 24 horas de antecedência em caso de cancelamento ou remarcação, para podermos disponibilizar o horário a outros clientes." },
  { q: "Os tratamentos são adequados para todos os tipos de pele?", a: "Sim! Adaptamos todos os tratamentos ao seu tipo de pele específico. Na primeira consulta realizamos uma análise completa para personalizar a sua experiência." },
  { q: "Quanto tempo dura cada tratamento?",                        a: "A duração varia consoante o serviço, entre 45 minutos e 2 horas. Pode consultar a duração de cada tratamento no catálogo de serviços." },
];

// ─── ESTILOS BASE ─────────────────────────────────────────
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

// ─── COMPONENTE ───────────────────────────────────────────
export default function ClientePage() {
  const [servicios,   setServicios]   = useState<Servicio[]>([]);
  const [citasRaw,    setCitasRaw]    = useState<CitaOcupada[]>([]);
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
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,168,169,${p.alpha})`; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5 || p.x > canvas.width + 5) p.dx *= -1;
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  useEffect(() => {
    supabase.from("servicios")
      .select("id, nombre, precio, duracion_minutos, categoria")
      .eq("activo", true)
      .then(({ data }) => { if (data) setServicios(data); });
  }, []);

  useEffect(() => {
    if (!form.data) return;
    const ini = new Date(`${form.data}T00:00:00`).toISOString();
    const fim = new Date(`${form.data}T23:59:59`).toISOString();
    supabase.from("citas").select("fecha_hora")
      .gte("fecha_hora", ini).lte("fecha_hora", fim).neq("estado", "cancelada")
      .then(({ data }) => { if (data) setCitasRaw(data as CitaOcupada[]); });
  }, [form.data]);

  const servicoSel  = servicios.find(s => s.id === form.servico_id);
  const duracao     = servicoSel?.duracion_minutos ?? 30;
  const slotsBase   = citasRaw.flatMap(c => slotsOcupados(c.fecha_hora, 60));
  const bloqDuracao = horasBloqueadasPorDuracao(slotsBase, duracao);
  const bloqPasado  = form.data === hojeISO() ? horasPasadas() : [];
  const todasBloq   = new Set([...slotsBase, ...bloqDuracao, ...bloqPasado]);

  function campo(f: keyof FormState, v: string) {
    if (f === "servico_id" || f === "data") setForm(p => ({ ...p, [f]: v, hora: "" }));
    else setForm(p => ({ ...p, [f]: v }));
    setErro(null);
  }

  function abrirModal(servico_id?: string) {
    if (servico_id) setForm(p => ({ ...p, servico_id, hora: "" }));
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

  const serviciosFiltrados = servicios.filter(sv => (sv.categoria ?? "").trim() === tabCat);

  const CONTACTO_ROWS: [string, string, string, string | null][] = [
    ["📍", "Morada",   "Rua Rodrigues Sampaio 146 1º esquerdo\n1150-282 Lisboa", null],
    ["📞", "Telefone", "+351 927 459 295",                                        "tel:+351927459295"],
    ["✉️", "Email",    "glowestheticportugal@gmail.com",                          "mailto:glowestheticportugal@gmail.com"],
    ["📸", "Instagram", `@${INSTAGRAM}`,                                          INSTAGRAM_URL],
    ["🕒", "Horário",  "Segunda a Sexta\n11:00h às 19:00h",                       null],
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: FONT_BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; } body { overflow-x: hidden; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: ${C.rose}; border-radius: 3px; }
        .svc-card { transition: transform .25s ease, box-shadow .25s ease !important; }
        .svc-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 40px rgba(236,168,169,0.28) !important; }
        .tab-pill:hover { background: ${C.roseMid} !important; }
        .wa-btn:hover { transform: scale(1.1) !important; }
        @media (max-width: 640px) {
          .nav-links { display: none !important; }
          .nav-menu-btn { display: flex !important; }
          .hero-btns { flex-direction: column !important; align-items: center !important; }
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
          <div className="nav-links" style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <a href="#servicos" style={{ color: C.text2, fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>Serviços</a>
            <a href="#faq"      style={{ color: C.text2, fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>FAQ</a>
            <a href="#contacto" style={{ color: C.text2, fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>Contacto</a>
            <a href="/admin" style={{ color: C.text2, fontSize: "0.82rem", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px", border: `1px solid ${C.roseMid}`, borderRadius: "20px", padding: "4px 12px" }}>🔒 Equipa</a>
            <button onClick={() => abrirModal()} style={{ ...S.btnRose, padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}>Marcar Agora</button>
          </div>
          <button className="nav-menu-btn"
            style={{ background: "none", border: "none", cursor: "pointer", display: "none", flexDirection: "column", gap: "5px", padding: "4px" }}
            onClick={() => setMenuOpen(v => !v)}>
            {[0,1,2].map(i => <span key={i} style={{ display: "block", width: "24px", height: "2px", background: C.roseDark, borderRadius: "2px" }} />)}
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu" style={{ background: C.white, borderTop: `1px solid ${C.roseMid}`, padding: "1rem 1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {[["#servicos","Serviços"],["#faq","FAQ"],["#contacto","Contacto"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: C.text, fontSize: "0.95rem", textDecoration: "none", fontWeight: 500, padding: "0.4rem 0", borderBottom: `1px solid ${C.roseMid}` }}>{label}</a>
            ))}
            <a href="/admin" style={{ color: C.text2, fontSize: "0.88rem", textDecoration: "none", fontWeight: 500, padding: "0.4rem 0", borderBottom: `1px solid ${C.roseMid}`, display: "flex", alignItems: "center", gap: "6px" }}>🔒 Acesso Equipa</a>
            <button onClick={() => abrirModal()} style={{ ...S.btnRose, padding: "0.75rem", fontSize: "0.95rem", marginTop: "0.25rem" }}>Marcar Agora</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "4rem 1.5rem 6rem", overflow: "hidden", background: `linear-gradient(155deg,#fff0f1 0%,#fce4e4 40%,#f8d0d0 100%)` }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url("https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1400&q=55")`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.07 }} />
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: "680px", width: "100%", opacity: heroVisible ? 1 : 0, transition: "opacity 0.9s ease, transform 0.9s ease", transform: heroVisible ? "translateY(0)" : "translateY(24px)" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", color: C.roseDeep, fontSize: "0.7rem", letterSpacing: "0.28em", textTransform: "uppercase", padding: "7px 22px", borderRadius: "999px", marginBottom: "1.75rem", border: `1px solid ${C.roseMid}`, fontWeight: 600 }}>
            Centro de Estética · Lisboa
          </div>
          <h1 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(2.2rem,6.5vw,5rem)", fontWeight: 700, color: C.text, lineHeight: 1.08, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
            A arte de <em style={{ color: C.rose, fontStyle: "italic" }}>cuidar</em><br />a sua beleza
          </h1>
          <p style={{ color: C.text2, fontSize: "clamp(0.95rem,2.5vw,1.1rem)", lineHeight: 1.75, marginBottom: "0.75rem", fontWeight: 300 }}>
            Experiências de bem-estar desde <strong style={{ color: C.roseDeep, fontWeight: 600 }}>35€</strong>
          </p>
          <p style={{ color: C.text3, fontSize: "0.88rem", marginBottom: "2.5rem" }}>Rua Rodrigues Sampaio 146, Lisboa</p>
          <div className="hero-btns" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => abrirModal()} style={{ ...S.btnRose, padding: "1rem 2.5rem", fontSize: "1rem", boxShadow: `0 8px 28px rgba(236,168,169,0.45)` }}>Reservar Experiência</button>
            <a href="#servicos" style={{ ...S.btnGhost, padding: "1rem 2.5rem", fontSize: "1rem" }}>Ver Serviços</a>
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
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(1.7rem,4vw,2.8rem)", fontWeight: 700, color: C.text }}>Cuide da sua pele</h2>
          <p style={{ color: C.text2, fontSize: "0.95rem", marginTop: "0.75rem" }}>Escolha o tratamento ideal para si</p>
        </div>
        <div className="tabs-scroll" style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
          {TABS_CAT.map(t => (
            <button key={t.key} className="tab-pill" onClick={() => setTabCat(t.key)}
              style={{ background: tabCat === t.key ? C.rose : C.white, color: tabCat === t.key ? C.white : C.text2, border: `1.5px solid ${tabCat === t.key ? C.rose : C.roseMid}`, borderRadius: "30px", padding: "0.5rem 1.35rem", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT_BODY }}>
              {t.label}
            </button>
          ))}
        </div>
        {serviciosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.text2 }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
            <p style={{ fontFamily: FONT_TITLE, fontSize: "1.1rem", color: C.roseDark, marginBottom: "0.5rem" }}>Em breve disponível</p>
            <p style={{ fontSize: "0.88rem" }}>Estamos a preparar tratamentos incríveis para esta categoria.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.75rem" }}>
            {serviciosFiltrados.map(sv => (
              <div key={sv.id} className="svc-card" style={{ background: C.white, borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(236,168,169,0.13)", border: `1px solid ${C.roseMid}` }}>
                <div style={{ height: "210px", overflow: "hidden", position: "relative", background: C.roseLight }}>
                  <img
                    src={getImagem(sv.nombre)}
                    alt={sv.nombre}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = IMG_DEFAULT; }}
                  />
                  <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(6px)", borderRadius: "999px", padding: "4px 12px", fontSize: "0.7rem", color: C.roseDeep, fontWeight: 600 }}>
                    {sv.duracion_minutos} min
                  </div>
                </div>
                <div style={{ padding: "1.4rem 1.5rem 1.6rem" }}>
                  <h3 style={{ fontFamily: FONT_TITLE, fontSize: "1.05rem", fontWeight: 700, color: C.text, marginBottom: "0.6rem" }}>{sv.nombre}</h3>
                  <p style={{ color: C.text2, fontSize: "0.82rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>{getDescricao(sv.nombre)}</p>
                  <button onClick={() => abrirModal(sv.id)} style={{ ...S.btnRose, width: "100%", padding: "0.72rem", fontSize: "0.85rem" }}>Reservar Experiência</button>
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
            <h2 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(1.5rem,3.5vw,2.4rem)", fontWeight: 700, color: C.text }}>Perguntas & Respostas</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ background: C.bg, border: `1px solid ${C.roseMid}`, borderRadius: "14px", overflow: "hidden" }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{ width: "100%", background: "none", border: "none", padding: "1.1rem 1.4rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: FONT_BODY, fontSize: "0.92rem", fontWeight: 600, color: C.text, textAlign: "left" as const, gap: "0.5rem" }}>
                  <span>{f.q}</span>
                  <span style={{ color: C.rose, fontSize: "1.3rem", transform: faqOpen === i ? "rotate(45deg)" : "rotate(0)", transition: "transform .3s", flexShrink: 0 }}>+</span>
                </button>
                {faqOpen === i && <div style={{ padding: "0 1.4rem 1.2rem", color: C.text2, fontSize: "0.87rem", lineHeight: 1.72 }}>{f.a}</div>}
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
            <h2 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(1.5rem,3.5vw,2.4rem)", fontWeight: 700, color: C.text }}>Contacto & Localização</h2>
          </div>
          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {CONTACTO_ROWS.map(([icon, label, value, href]) => (
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
      <footer style={{ background: `linear-gradient(135deg,#fce4e4 0%,${C.roseLight} 100%)`, borderTop: `1px solid ${C.roseMid}`, padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <span style={{ fontFamily: FONT_TITLE, color: C.rose, fontWeight: 700, fontSize: "1.4rem", letterSpacing: "0.05em" }}>Glow Esthetic</span>
        <p style={{ color: C.text2, fontSize: "0.78rem", marginTop: "0.5rem" }}>Rua Rodrigues Sampaio 146 1º esquerdo, Lisboa · +351 927 459 295</p>
        <p style={{ color: C.text3, fontSize: "0.74rem", marginTop: "0.25rem" }}>Segunda a Sexta · 11:00h às 19:00h</p>
        <div className="footer-links" style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" style={{ color: C.roseDeep, fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>Instagram</a>
          <a href={`https://wa.me/${WA_NUM}`} target="_blank" rel="noreferrer" style={{ color: C.green, fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>WhatsApp</a>
        </div>
        <p style={{ color: C.text3, fontSize: "0.7rem", marginTop: "1rem" }}>© {new Date().getFullYear()} Glow Esthetic. Todos os direitos reservados.</p>
        <a href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "1.25rem", color: C.text2, fontSize: "0.78rem", textDecoration: "none", fontWeight: 500, background: "rgba(255,255,255,0.6)", border: `1px solid ${C.roseMid}`, borderRadius: "20px", padding: "5px 14px", letterSpacing: "0.03em" }}>
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
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(51,51,51,0.55)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
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
                    const bloq = todasBloq.has(h);
                    const sel  = form.hora === h;
                    return (
                      <button key={h} disabled={bloq} onClick={() => !bloq && campo("hora", h)}
                        style={{ padding: "0.5rem", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, cursor: bloq ? "not-allowed" : "pointer", background: sel ? C.rose : bloq ? "#f5f5f5" : C.white, color: sel ? C.white : bloq ? "#ccc" : C.text2, border: sel ? `1.5px solid ${C.rose}` : `1px solid ${C.roseMid}`, textDecoration: bloq ? "line-through" : "none", transition: "all .15s", fontFamily: FONT_BODY }}>
                        {h}
                      </button>
                    );
                  })}
                </div>

                {erro && <p style={{ color: "#e05555", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{erro}</p>}

                <button
                  style={{ ...S.btnRose, width: "100%", padding: "0.95rem", fontSize: "0.95rem", opacity: loading ? 0.65 : 1, boxShadow: `0 6px 20px rgba(236,168,169,0.4)` }}
                  onClick={reservar}
                  disabled={loading}>
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