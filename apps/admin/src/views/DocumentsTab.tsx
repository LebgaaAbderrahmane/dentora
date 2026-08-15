import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PatientDocument } from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import { api, ApiError } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const MAX_SIZE_MB = 50
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsTab({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await api.documents(patientId)
      setDocuments(r.documents)
    } catch {
      toast(t('auth.serverError'), 'error')
    }
  }, [patientId, t, toast])

  useEffect(() => {
    void load()
  }, [load])

  async function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast(`${t('patients.docs.uploadError')} (max ${MAX_SIZE_MB} MB)`, 'error')
      e.target.value = ''
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      await api.uploadDocument(patientId, file, setProgress)
      toast(t('patients.docs.uploaded'), 'success')
      await load()
    } catch (err) {
      if (err instanceof ApiError && err.message === 'FORBIDDEN') {
        toast(t('auth.serverError'), 'error')
      } else {
        toast(t('patients.docs.uploadError'), 'error')
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => void handlePick(e)} />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? t('patients.docs.uploading') : t('patients.docs.upload')}
        </Button>
        {uploading && <Progress value={Math.round(progress * 100)} className="w-40" />}
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('patients.docs.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">{d.originalName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(d.size)} · {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={api.documentUrl(patientId, d.id)} target="_blank" rel="noreferrer">
                    {t('patients.docs.open')}
                  </a>
                </Button>
                <Button asChild size="sm">
                  <a href={api.documentUrl(patientId, d.id)} download={d.originalName}>
                    {t('patients.docs.download')}
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
