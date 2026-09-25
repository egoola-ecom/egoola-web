/**
 * Shapes shared by Admin, Seller, and Buyer records for their free-form
 * JSON profile fields (skills/experience/education) and uploaded media —
 * the backend stores these as unconstrained JSON, so this is the shape
 * the panel itself writes and reads.
 */

export interface ExperienceEntry {
  title: string;
  company: string;
  from: string;
  to: string;
  description?: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
}

export interface MediaItem<TFor extends string = string> {
  id: number;
  media_type: "image" | "video" | "document";
  media_for: TFor;
  media_path: string;
  media_url: string;
}
