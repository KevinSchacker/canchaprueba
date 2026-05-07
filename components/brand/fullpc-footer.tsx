export function FullPCFooter() {
  return (
    <footer className="py-6 flex justify-center items-center">
      <a
        href="https://www.fullpc.com.ar"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
      >
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Powered by
        </span>
        <img
          src="https://www.fullpc.com.ar/favicom.png"
          alt="FullPC"
          className="h-4 w-auto"
          onError={(e) => { 
            e.currentTarget.src = 'https://www.fullpc.com.ar/favicon.png'; 
            e.currentTarget.onerror = null; 
          }}
        />
      </a>
    </footer>
  )
}
