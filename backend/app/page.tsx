import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07111C",
        color: "#F4F7FB",
        fontFamily: '"Segoe UI", Inter, system-ui, sans-serif',
        padding: "48px 24px",
      }}
    >
      <div style={{ width: "min(640px, 100%)", margin: "0 auto" }}>
        <img
          src="/logo.png"
          alt="Fender"
          width={72}
          height={72}
          style={{ display: "block", borderRadius: 16, background: "#fff", marginBottom: 18 }}
        />
        <p style={{ color: "#F5A524", fontWeight: 700, letterSpacing: "0.08em", fontSize: 12 }}>
          FENDER
        </p>
        <h1 style={{ fontSize: 36, margin: "8px 0 12px" }}>Hazard API</h1>
        <p style={{ color: "#9AA8B8", lineHeight: 1.5, marginBottom: 24 }}>
          Writes from the citizen and crew app go through these routes. Council officers and relief
          coordinators use the staff dashboard.
        </p>
        <Link
          href="/dashboard/login"
          style={{
            display: "inline-block",
            background: "#F5A524",
            color: "#07111C",
            fontWeight: 800,
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 28,
          }}
        >
          Open staff dashboard
        </Link>
        <pre
          style={{
            background: "#122033",
            border: "1px solid #24344A",
            borderRadius: 16,
            padding: 16,
            overflow: "auto",
          }}
        >
          {`POST /api/report
POST /api/override
POST /api/resolve
POST /api/confirm

GET  /api/hazards
GET  /api/wards
GET  /api/shelters`}
        </pre>
      </div>
    </main>
  );
}
