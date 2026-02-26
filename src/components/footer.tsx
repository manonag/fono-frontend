export function Footer() {
  return (
    <footer className="py-6 px-4 text-center text-sm text-brown">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-0">
        <span>&copy; 2026 Fono Inc.</span>
        <span className="hidden sm:inline">&nbsp;&middot;&nbsp;</span>
        <div className="flex items-center gap-1">
          <a href="#" className="text-terra hover:underline">Privacy</a>
          <span>&middot;</span>
          <a href="#" className="text-terra hover:underline">Terms</a>
          <span>&middot;</span>
          <a href="#" className="text-terra hover:underline">Contact</a>
        </div>
        <span className="hidden sm:inline">&nbsp;&middot;&nbsp;</span>
        <a href="mailto:support@fono.services" className="text-terra hover:underline">support@fono.services</a>
      </div>
    </footer>
  )
}
