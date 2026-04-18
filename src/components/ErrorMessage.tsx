interface ErrorMessageProps {
  error: string | null
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null

  return (
    <p className="text-xs font-mono text-destructive" role="alert">
      {error}
    </p>
  )
}
