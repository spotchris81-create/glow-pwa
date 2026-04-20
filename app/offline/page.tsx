export default function OfflinePage() {
  return (
    <main style={{ minHeight:"100vh", background:"#080808",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"Inter,sans-serif", color:"#e5e5e5" }}>
      <span style={{ fontSize:"2rem", color:"#c9a84c" }}>✦</span>
      <h1 style={{ color:"#fff", fontWeight:600, margin:"1rem 0 .5rem" }}>
        Sin conexión
      </h1>
      <p style={{ color:"#555", fontSize:".9rem" }}>
        Comprueba internet e intenta de nuevo.
      </p>
    </main>
  );
}