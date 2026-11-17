import { Link } from 'react-router-dom'
import { BarChart3, Sparkles, FileSpreadsheet, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const features = [
  { icon: FileSpreadsheet, title: 'Upload & Parse', desc: 'Drag-and-drop .xlsx, .xls, and .csv files. Multi-sheet support out of the box.' },
  { icon: BarChart3,       title: 'Auto Dashboard', desc: 'Detect column types and auto-generate beautiful, interactive charts instantly.' },
  { icon: Sparkles,        title: 'AI Assistant',   desc: 'Ask questions like "which region had the highest Q3 sales?" in plain English.' },
  { icon: Zap,             title: 'Formula Engine', desc: 'Run SUM, IF, VLOOKUP, and 40+ Excel functions directly in your browser.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-base">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 h-16 border-b border-[--color-border]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
            <span className="font-display font-bold text-white text-sm">E</span>
          </div>
          <span className="font-display font-bold text-[--color-text-primary] text-lg">ExcelAI</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/register"><Button size="sm">Get started</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Powered by Claude AI
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-bold text-[--color-text-primary] mb-6 leading-tight">
          Your Excel data,{' '}
          <span className="text-brand-primary">intelligently</span>
        </h1>
        <p className="text-lg text-[--color-text-secondary] max-w-xl mx-auto mb-10">
          Upload any Excel file and instantly get beautiful dashboards, AI-powered insights,
          and natural language querying — no SQL, no Python needed.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/register">
            <Button size="lg">Start for free</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">Sign in</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface-card border border-[--color-border] rounded-xl p-6 hover:border-brand-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-primary" />
              </div>
              <h3 className="font-semibold text-[--color-text-primary] mb-2">{title}</h3>
              <p className="text-sm text-[--color-text-secondary] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
