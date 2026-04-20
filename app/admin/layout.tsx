import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Glow",
  description: "Panel de gestión de citas Glow.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={s.shell}>
      <nav style={s.nav}>
        <span style={s.brand}>✦ GLOW</span>
        <span style={s.badge}>Admin</span>
        <div style={s.spacer} />
        <a href="/" style={s.link}>← Vista cliente</a>
      </nav>
      <div style={s.content}>{children}</div>
    </div>
  );
}

const GOLD        = "#c9a84c";
const GOLD_BORDER = "#c9a84c33";

const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    background: "#080808",
    display: "flex",
    flexDirection: "column",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0 1.5rem",
    height: "52px",
    borderBottom: "1px solid #161616",
    background: "#0a0a0a",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  brand: {
    fontSize: "1rem",
    fontWeight: 700,
    color: GOLD,
    letterSpacing: "0.2em",
  },
  badge: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: GOLD,
    background: GOLD_BORDER,
    border: `1px solid ${GOLD_BORDER}`,
    borderRadius: "999px",
    padding: "2px 8px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  spacer: { flex: 1 },
  link: {
    color: "#555",
    fontSize: "0.8rem",
    textDecoration: "none",
    letterSpacing: "0.02em",
  },
  content: {
    flex: 1,
    padding: "0",
  },
};