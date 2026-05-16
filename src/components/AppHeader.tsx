export function AppHeader() {
  return (
    <header className="flex items-center justify-between py-6 px-4">
      <div>
        <h1 className="text-xl font-semibold leading-tight">WebAuthn Decoder</h1>
        <p className="text-sm text-muted-foreground">Decode and diagnose WebAuthn payloads</p>
      </div>
    </header>
  )
}
