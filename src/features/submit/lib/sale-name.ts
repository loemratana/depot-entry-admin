// Same comparison as the backend (utils/names.js): ignore spaces, zero-width
// characters, case and the interchangeable Khmer subscripts ្ដ / ្ត
export const saleNameKey = (value: string) =>
  value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\u2060\uFEFF\s]/g, '')
    .replace(/្ដ/g, '្ត')
    .toLowerCase()
