/**
 * Shared facts for the Terms and Privacy pages.
 * Both texts are drafts until the legal review before the beta (PRD §11); bump LEGAL_UPDATED when either changes.
 */
export const LEGAL_UPDATED = "1 בנובמבר 2026";

/** Support address shown on the legal pages. Set NEXT_PUBLIC_SUPPORT_EMAIL once the mailbox exists. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@joby-ai.com";

/** Who operates the service. Replace with the legal entity (name and number) once it is registered. */
export const OPERATOR = "צוות Joby";
