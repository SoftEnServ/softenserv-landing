export type ProjectStatus = 'planificado' | 'en_progreso' | 'completado';

export interface Project {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: ProjectStatus;
  progress: number;
  client: 'empresa' | 'persona';
  technologies: string[];
  image_url: string | null;
  repo_url: string | null;
  demo_url: string | null;
  featured: boolean;
  started_at: string | null;
}

export interface ContactRequest {
  email: string;
  message: string;
}
