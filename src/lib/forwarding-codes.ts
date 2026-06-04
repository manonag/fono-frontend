// Carrier forwarding-code derivation for the Connect / Step 5 flow.
//
// Per CD hand-off §2.3. Two families of codes:
//   - Fono Live      -> UNCONDITIONAL forwarding ("forward every call")
//   - Fono Voicemail -> CONDITIONAL forwarding ("forward when busy/unanswered")
//
// `other` returns null: engineering renders the generic
// "dial your provider's code, then enter +1..." instruction instead of a
// concrete dial string.

export type Carrier = 'att' | 'verizon' | 'tmobile' | 'sprint' | 'other'
export type CallPath = 'live' | 'voicemail'

export const CARRIER_LABELS: Record<Carrier, string> = {
  att: 'AT&T',
  verizon: 'Verizon',
  tmobile: 'T-Mobile',
  sprint: 'Sprint',
  other: 'Other',
}

// Returns the dial string for a carrier+path, or null for `other`
// (and any unknown carrier). `fonoNumber` is E.164; the leading '+' is
// stripped for the dial-code interpolation.
export function forwardingCodeFor(
  carrier: Carrier,
  path: CallPath,
  fonoNumber: string,
): string | null {
  const f = fonoNumber.replace(/^\+/, '')
  if (path === 'live') {
    // Unconditional forwarding ("forward every call").
    const codes: Record<Carrier, string | null> = {
      att: `*72*${f}`,
      tmobile: `*21*${f}#`,
      verizon: `*72 ${f}`,
      sprint: `*72 ${f}`,
      other: null,
    }
    return codes[carrier] ?? null
  }
  // Conditional forwarding ("forward when busy or unanswered").
  const codes: Record<Carrier, string | null> = {
    att: `**61*${f}#`,
    tmobile: `**61*${f}#`,
    verizon: `*71 ${f}`,
    sprint: `*73 ${f}`,
    other: null,
  }
  return codes[carrier] ?? null
}
