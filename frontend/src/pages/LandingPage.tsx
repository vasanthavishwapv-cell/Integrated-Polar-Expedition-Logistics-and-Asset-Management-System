import { useNavigate } from 'react-router-dom';
import {
  Radio, Map, Package, Archive, Brain, Users, Wrench, AlertTriangle,
  Shield, Cpu, Layers, ChevronRight, ArrowRight, Activity,
} from 'lucide-react';

const FEATURES = [
  { icon: Map, title: 'Expedition Planning', description: 'End-to-end mission lifecycle: draft → planned → active → completed with enforced status transitions and audit trail.' },
  { icon: Package, title: 'Cargo & Shipment Tracking', description: 'Real-time status tracking for all cargo movements between stations with transactional, idempotent receipt processing.' },
  { icon: Archive, title: 'Inventory Intelligence', description: 'N-day moving average depletion forecasting with explainable formula inputs, confidence levels, and visual charts.' },
  { icon: Brain, title: 'Decision Support', description: 'Rule-based alert engine running every 5 minutes. Every alert shows the rule name, inputs, and computed outputs — no black boxes.' },
  { icon: Users, title: 'Personnel Tracking', description: 'Self-reported check-in/check-out movement records with full history. Station occupancy visible at a glance.' },
  { icon: Wrench, title: 'Asset Management', description: 'Maintenance schedule tracking with condition-based and time-based due alerts. Supports fault reporting by station ops.' },
  { icon: AlertTriangle, title: 'Emergency Coordination', description: 'Incident lifecycle from report to resolution. Response timeline, coordinator assignment, and affected resource tracking.' },
  { icon: Shield, title: 'RBAC Security', description: 'Seven roles from System Admin to Station Ops. Every API endpoint enforces module-level permissions (full/limited/read/none).' },
];

const DEMO_STATS = [
  { label: 'Demo Stations', value: '3', sublabel: 'Maitri, Dakshin Gangotri, Bharati' },
  { label: 'Seed Expeditions', value: '6', sublabel: 'Mix of active, planned, and completed' },
  { label: 'Demo Personnel', value: '15', sublabel: 'Across all 3 stations' },
  { label: 'Seeded Alerts', value: '10', sublabel: 'Open alerts with explanations' },
];

const ROLES = [
  { name: 'System Admin', email: 'admin@polaris.dev' },
  { name: 'Expedition Coord.', email: 'coordinator@polaris.dev' },
  { name: 'Logistics Officer', email: 'logistics@polaris.dev' },
  { name: 'Inventory Manager', email: 'inventory@polaris.dev' },
  { name: 'Emergency Coord.', email: 'emergency@polaris.dev' },
  { name: 'Station Ops', email: 'ops@polaris.dev' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Navigation */}
      <nav className="border-b border-[rgba(148,163,184,0.1)] bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/20 flex items-center justify-center">
              <Radio className="w-4 h-4 text-accent-primary" />
            </div>
            <span className="font-bold text-gradient">POLARIS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted hidden sm:block">SIH 2026 · Problem SIH26062</span>
            <button onClick={() => navigate('/login')} className="btn-primary text-sm py-2">
              Open Demo →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #48CAE4 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-accent-primary/5 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-xs text-accent-primary mb-6">
            <Activity className="w-3.5 h-3.5" />
            Smart India Hackathon 2026 · Problem SIH26062
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            <span className="text-text-primary">Polar Logistics &</span>
            <br />
            <span className="text-gradient">Resource Intelligence System</span>
          </h1>

          <p className="text-xl text-text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
            A unified platform replacing fragmented spreadsheets and radio logs for Indian polar research station coordination — expeditions, cargo, inventory, personnel, assets, and emergency response in one command dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary text-base py-3 px-8 flex items-center gap-2"
              id="hero-demo-btn"
            >
              Launch Demo <ArrowRight className="w-5 h-5" />
            </button>
            <div className="text-sm text-text-muted">
              All passwords: <code className="text-accent-secondary">Polaris@2026</code>
            </div>
          </div>

          {/* Demo stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {DEMO_STATS.map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <div className="text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="text-sm font-medium text-text-primary mt-0.5">{stat.label}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-3">Every Module, Fully Integrated</h2>
            <p className="text-text-muted max-w-xl mx-auto">Eight functional modules sharing a single MongoDB instance, REST API, and JWT-RBAC auth layer.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="glass-card p-5 hover:border-accent-primary/30 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-3 group-hover:bg-accent-primary/20 transition-colors">
                  <Icon className="w-4 h-4 text-accent-primary" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-16 px-6 border-t border-[rgba(148,163,184,0.08)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-text-primary mb-2 flex items-center justify-center gap-2">
              <Cpu className="w-5 h-5 text-accent-primary" /> Technology Stack
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { layer: 'Frontend', tech: 'React 18 + Vite + TypeScript + Tailwind CSS' },
              { layer: 'State', tech: 'Zustand + React Query + Recharts' },
              { layer: 'Backend', tech: 'Node.js + Express + TypeScript + Pino' },
              { layer: 'Database', tech: 'MongoDB Atlas + Mongoose' },
              { layer: 'Auth', tech: 'JWT (Access + Refresh) + HttpOnly cookies' },
              { layer: 'Validation', tech: 'Zod schemas (shared frontend/backend)' },
              { layer: 'Offline', tech: 'Dexie.js + Zustand sync queue' },
              { layer: 'Intelligence', tech: 'N-day moving average + rule-based alerts' },
            ].map((item) => (
              <div key={item.layer} className="glass-card p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{item.layer}</p>
                <p className="text-xs text-text-primary mt-0.5">{item.tech}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo accounts */}
      <section className="py-16 px-6 border-t border-[rgba(148,163,184,0.08)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-text-primary mb-2 flex items-center justify-center gap-2">
              <Layers className="w-5 h-5 text-accent-primary" /> Demo Accounts
            </h2>
            <p className="text-text-muted text-sm">One account per role. Password for all: <code className="text-accent-secondary">Polaris@2026</code></p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ROLES.map(({ name, email }) => (
              <button
                key={email}
                onClick={() => navigate('/login')}
                className="glass-card p-3 text-left hover:border-accent-primary/30 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{name}</p>
                  <p className="text-[10px] font-mono text-text-muted">{email}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-[rgba(148,163,184,0.08)] text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-4">Ready for the Live Demo?</h2>
          <p className="text-text-muted mb-8">Seed the database with <code className="text-accent-secondary">npm run seed</code> in the backend, then launch POLARIS.</p>
          <button onClick={() => navigate('/login')} className="btn-primary text-base py-3 px-10 flex items-center gap-2 mx-auto">
            <Radio className="w-5 h-5" /> Launch POLARIS →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(148,163,184,0.08)] py-6 px-6 text-center text-xs text-text-muted">
        <p>POLARIS — Built for Smart India Hackathon 2026 · Problem SIH26062</p>
        <p className="mt-1">All data is simulated for demonstration purposes. Not a production deployment.</p>
      </footer>
    </div>
  );
}
