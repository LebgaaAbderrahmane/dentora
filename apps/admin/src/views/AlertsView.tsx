import { useEffect, useState } from 'react'
import type { ExpiringLotAlert, ProductUnit, StockAlerts } from '@dentora/contracts'
import { useI18n } from '@dentora/i18n'
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

export function AlertsView() {
  const { t } = useI18n()
  const [alerts, setAlerts] = useState<StockAlerts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setAlerts(await api.alerts(30))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  const pending = alerts?.expiring.filter((l) => !l.expired).length ?? 0
  const expired = alerts?.expiring.filter((l) => l.expired).length ?? 0
  const low = alerts?.lowStock.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('alerts.title')}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {t('alerts.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          {!error && loading && !alerts && <p className="text-sm text-muted-foreground">…</p>}
          {!error && alerts && (
            <div className="grid gap-4 lg:grid-cols-3">
              <AlertCard
                tone="amber"
                count={low}
                title={t('alerts.lowStock')}
                empty={t('alerts.lowStockEmpty')}
                rows={alerts.lowStock.map((a) => (
                  <Row
                    key={a.productId}
                    name={a.productName}
                    detail={`${t('alerts.onHand')}: ${a.quantityOnHand} / ${a.reorderLevel} ${t(
                      UNIT_KEY[a.unit],
                    )}`}
                  />
                ))}
              />
              <AlertCard
                tone="orange"
                count={pending}
                title={t('alerts.expiringSoon')}
                empty={t('alerts.expiringEmpty')}
                rows={alerts.expiring
                  .filter((l) => !l.expired)
                  .map((l) => (
                    <ExpiringRow key={`${l.productId}-${l.batch}`} lot={l} />
                  ))}
              />
              <AlertCard
                tone="red"
                count={expired}
                title={t('alerts.expired')}
                empty={t('alerts.expiredEmpty')}
                rows={alerts.expiring
                  .filter((l) => l.expired)
                  .map((l) => (
                    <ExpiringRow key={`${l.productId}-${l.batch}`} lot={l} expired />
                  ))}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AlertCard({
  title,
  count,
  empty,
  rows,
  tone,
}: {
  title: string
  count: number
  empty: string
  rows: React.ReactNode[]
  tone: 'amber' | 'orange' | 'red'
}) {
  const badge =
    tone === 'amber'
      ? 'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      : tone === 'orange'
        ? 'border-orange-500/30 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
        : 'border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge}`}>
          {count}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : rows}
      </div>
    </div>
  )
}

function Row({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{detail}</p>
    </div>
  )
}

function ExpiringRow({ lot, expired }: { lot: ExpiringLotAlert; expired?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {lot.productName}
        {expired && (
          <span className="ms-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
            {t('alerts.expiredTag')}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        {t('alerts.batch')}: {lot.batch} · {t('alerts.expiresOn')}{' '}
        {new Date(lot.expiryDate).toLocaleDateString()} · {t('alerts.remaining')}: {lot.remaining}
      </p>
    </div>
  )
}
