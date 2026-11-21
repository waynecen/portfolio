import type { Card } from './core/interact'

// The About sign and the Contact mailbox. Like the projects, their words and links come from the
// HTML page (#about and #contact in index.html), so the page and the island always match.

/** Where they stand: the sign beside the house, the mailbox out front. On tile centres, so roads lead to them. */
export const ABOUT_AT = { x: -6, z: -2 }
export const CONTACT_AT = { x: -1, z: 3 }

const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

/** The bio, one line of dialogue per paragraph. */
export const aboutLines: string[] = Array.from(document.querySelectorAll('#about p'), text).filter(Boolean)

const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('#contact a'), (a) => ({ label: text(a), href: a.href }))

/** The contact card. The first link is what the mailbox opens. */
export const contactCard: Card = {
  title: text(document.querySelector('#contact h2')) || 'Contact',
  description: text(document.querySelector('#contact p')),
  url: links[0]?.href ?? '',
  action: links[0] && `Open ${links[0].label}`,
  links,
}
