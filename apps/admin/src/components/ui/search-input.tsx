import * as React from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

// Shared list-search field: magnifier on the left, a clear button that appears
// once the user has typed (Escape clears too). All list views use this instead
// of repeating a bare <Input> so search behaves identically everywhere.
function SearchInput({
  className,
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
}) {
  const showClear = value.length > 0
  return (
    <div className={cn('relative max-w-xs', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('')
        }}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {showClear && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={props['aria-label'] ? `${props['aria-label']} — clear` : 'Clear'}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
