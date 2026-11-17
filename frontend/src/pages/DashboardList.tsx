import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { LayoutDashboard, Plus, Trash2, Share2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { dashboardsApi, type Dashboard } from '@/api/dashboards.api'
import { workbooksApi } from '@/api/workbooks.api'
import { formatDate } from '@/utils/formatters'
import type { Workbook } from '@/types/workbook.types'

export default function DashboardList() {
  const navigate = useNavigate()
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedWb, setSelectedWb] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    Promise.all([dashboardsApi.list(), workbooksApi.list()])
      .then(([ds, wbs]) => {
        setDashboards(ds)
        setWorkbooks(wbs.items)
        if (wbs.items[0]) setSelectedWb(wbs.items[0].id)
      })
      .catch(() => toast.error('Failed to load dashboards'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newName.trim() || !selectedWb) return
    setCreating(true)
    try {
      const d = await dashboardsApi.create({ workbook_id: selectedWb, name: newName.trim() })
      navigate(`/dashboards/${d.id}`)
    } catch {
      toast.error('Failed to create dashboard')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete dashboard "${name}"?`)) return
    try {
      await dashboardsApi.delete(id)
      setDashboards(prev => prev.filter(d => d.id !== id))
      toast.success('Dashboard deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-brand-primary" />
          <h1 className="text-2xl font-display font-bold text-[--color-text-primary]">Dashboards</h1>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4" /> New dashboard
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-4">
          <h3 className="font-semibold text-[--color-text-primary]">Create dashboard</h3>
          <Input
            label="Dashboard name"
            placeholder="Q3 Sales Overview"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[--color-text-secondary]">Workbook</label>
            <select
              className="bg-surface-elevated border border-[--color-border] rounded-[--radius-md] px-3 py-2 text-sm text-[--color-text-primary] outline-none focus:border-brand-primary"
              value={selectedWb}
              onChange={e => setSelectedWb(e.target.value)}
            >
              {workbooks.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} loading={creating} disabled={!newName.trim() || !selectedWb}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : dashboards.length === 0 ? (
        <Card className="text-center py-12">
          <LayoutDashboard className="mx-auto w-10 h-10 text-[--color-text-tertiary] mb-3" />
          <p className="text-[--color-text-secondary]">No dashboards yet. Create one above.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {dashboards.map(d => (
            <Card
              key={d.id}
              className="flex items-center gap-4 cursor-pointer hover:border-brand-primary/50 transition-all p-4"
              onClick={() => navigate(`/dashboards/${d.id}`)}
            >
              <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-5 h-5 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[--color-text-primary] truncate">{d.name}</p>
                <p className="text-xs text-[--color-text-tertiary] mt-0.5">
                  {d.layout.length} widget{d.layout.length !== 1 ? 's' : ''} · Updated {formatDate(d.updated_at)}
                </p>
              </div>
              {d.is_public && <Badge variant="info"><Share2 className="w-3 h-3 mr-1 inline" />Shared</Badge>}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(d.id, d.name) }}
                className="p-2 rounded hover:bg-red-900/20 text-[--color-text-tertiary] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ExternalLink className="w-4 h-4 text-[--color-text-tertiary]" />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
