// Small line drawings in the text's colour: beside each item in the touch menu (MenuPanel.tsx), and on
// the Bag button (InventoryPanel.tsx). `.menu-icon` in panels.css sizes them.

const ICONS = {
  bag: 'M6 9h12l-1 11H7L6 9Zm3 0V7a3 3 0 0 1 6 0v2',
  log: 'M7 4h10v16H7zM10 8h4M10 12h4M10 16h2',
  camera: 'M4 8h4l1.5-2h5L16 8h4v11H4V8Zm8 2.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1',
  chair: 'M7 4v16M7 12h10v8M7 12V4h8v8M17 12v8',
}

export function LineIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
