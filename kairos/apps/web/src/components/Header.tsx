import { RefreshCw, Zap } from 'lucide-react'
import { useJobStore } from '../stores/jobStore'
import clsx from 'clsx'

export default function Header() {
  const { connectionStatus, isDemo, total, status, search } = useJobStore()

  const isLoading = status === 'loading'

  return (
    <header className="h-14 bg-white border-b border-silk flex items-center px-6 gap-4 shrink-0 z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 bg-ink-0 rounded-md flex items-center justify-center">
          <span className="font-serif italic text-white text-lg leading-none">K</span>
        </div>
        <span className="font-serif italic text-ink-0 text-xl">Kairós</span>
      </div>

      {/* Status badge */}
      <div
        className={clsx(
          'flex items-center gap-1.5 text-xs font-sans font-medium px-2.5 py-1 rounded-full',
          connectionStatus === 'live'
            ? 'bg-success-l text-success'
            : connectionStatus === 'demo'
            ? 'bg-warning-l text-warning'
            : connectionStatus === 'loading'
            ? 'bg-pearl text-ink-50'
            : 'bg-error-l text-error'
        )}
      >
        <span
          className={clsx('w-1.5 h-1.5 rounded-full', {
            'bg-success animate-pulse': connectionStatus === 'live',
            'bg-warning': connectionStatus === 'demo',
            'bg-ink-60': connectionStatus === 'loading',
            'bg-error': connectionStatus === 'error',
          })}
        />
        {connectionStatus === 'live' && `Connecté · ${total.toLocaleString('fr-CH')} offres`}
        {connectionStatus === 'demo' && 'Mode démo'}
        {connectionStatus === 'loading' && 'Connexion…'}
        {connectionStatus === 'error' && 'Erreur connexion'}
      </div>

      {/* Source badge */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-ink-40 border border-silk rounded-full px-2.5 py-1">
        <span>🇨🇭</span>
        <span>{isDemo ? 'données démo' : 'job-room.ch · SECO'}</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <button
        onClick={() => void search()}
        disabled={isLoading}
        className={clsx(
          'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-silk',
          'text-ink-30 hover:bg-pearl transition-colors duration-150',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <RefreshCw size={14} className={clsx(isLoading && 'animate-spin')} />
        Actualiser
      </button>

      <button
        className={clsx(
          'flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md',
          'bg-accent text-white hover:bg-accent-h',
          'shadow-1 hover:shadow-2 hover:-translate-y-px',
          'transition-all duration-150 ease-kairos'
        )}
      >
        <Zap size={14} />
        Postuler en masse
      </button>
    </header>
  )
}
