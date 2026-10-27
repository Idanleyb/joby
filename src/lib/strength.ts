import { profileStrength, stepPath } from "@/lib/provider";
import type { ProviderView } from "@/lib/provider-view";

/** Profile strength (PRD 5.2) plus "add X" tips, like Upwork's profile completeness. */
export function strengthWithTips(p: NonNullable<ProviderView>) {
  const value = profileStrength({
    verification: p.verification_status, headline: p.headline, bio: p.bio, subcategories: p.subcategories.length,
    skills: p.skills.length, photo: Boolean(p.photo_path), cv: Boolean(p.cv_path), services: p.services.length,
    portfolio: (p.portfolio_links?.length ?? 0) + p.gallery.length,
  });
  const tips = [
    !["pending", "approved"].includes(p.verification_status) && { label: "אימות שירות (טופס 3010)", gain: 25, href: stepPath("proof") },
    !(p.headline && p.bio) && { label: "כותרת ותיאור", gain: 20, href: stepPath("about") },
    !p.skills.length && { label: "מיומנויות", gain: 5, href: stepPath("categories") },
    !p.photo_path && { label: "תמונת פרופיל", gain: 10, href: stepPath("photo") },
    !p.cv_path && { label: "קורות חיים", gain: 10, href: stepPath("cv") },
    !p.services.length && { label: "שירות עם מחיר", gain: 10, href: stepPath("services") },
    !(p.portfolio_links?.length || p.gallery.length) && { label: "תמונות מעבודות", gain: 10, href: "/profile#gallery" },
  ].filter(Boolean) as { label: string; gain: number; href: string }[];
  return { value, tips };
}
