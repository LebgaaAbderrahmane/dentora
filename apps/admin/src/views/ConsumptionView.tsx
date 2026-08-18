import { useEffect, useState } from 'react'
import type { ProductUnit, TreatmentConsumption } from '@dentora/contracts'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import type { MessageKey } from '@dentora/i18n'
import { api, ApiError } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const UNIT_KEY: Record<ProductUnit, MessageKey> = {
  UNIT: 'products.unit.unit',
  BOX: 'products.unit.box',
  PACK: 'products.unit.pack',
  BOTTLE: 'products.unit.bottle',
  JAR: 'products.unit.jar',
  SYRINGE: 'products.unit.syringe',
  SET: 'products.unit.set',
  KIT: 'products.unit.kit',
}

export function ConsumptionView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<TreatmentConsumption[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await api.consumptions({ limit: 200 })
      setItems(r.items)
      setTotal(r.total)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('consumption.title')}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {t('alerts.refresh')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {loading && !items.length && <p className="text-sm text-muted-foreground">…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('consumption.empty')}</p>
        )}
        {items.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-2.5 text-sm"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium text-foreground">{c.productName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {c.patientName} · {new Date(c.consumedAt).toLocaleString()}
                {c.createdByName ? ` · ${t('consumption.by')} ${c.createdByName}` : ''}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {c.quantity} {t(UNIT_KEY[c.unit])}
              </span>
              {c.batch && <span className="font-mono">#{c.batch}</span>}
            </div>
          </div>
        ))}
        {total > items.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            {total} {t('audit.events')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
