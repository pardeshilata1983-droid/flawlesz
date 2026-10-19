export interface TeammateConfig {
  id: string;
  name: string;
  role: string;
  provider: string;
  description: string;
}

/**
 * Canonical AI Teammates config used across the application.
 * All roles and descriptions focus strictly on research, writing, analysis, planning, and review.
 * Descriptions are concise (<= 12 words) with zero mentions of code, building apps, or AI model/provider names.
 */
export const TEAMMATE_PRESETS: TeammateConfig[] = [
  {
    id: 'atlas',
    name: 'Atlas',
    role: 'Researcher',
    provider: 'groq',
    description: 'Produces verified facts with sources and citations.'
  },
  {
    id: 'elena',
    name: 'Elena',
    role: 'Writer',
    provider: 'openai',
    description: 'Produces the draft in clear, plain language.'
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Analyst',
    provider: 'groq',
    description: 'Produces comparisons, numbers, and structured tables.'
  },
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'Planner',
    provider: 'xai',
    description: 'Produces ordered steps with time estimates.'
  },
  {
    id: 'iris',
    name: 'Iris',
    role: 'Reviewer',
    provider: 'perplexity',
    description: 'Produces a list (max 5) of concrete fixes to the output.'
  }
];
