export interface Certification {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
  pdf?: string;
  category?: string;
  featured?: boolean;
}

export const certifications: Certification[] = [];
