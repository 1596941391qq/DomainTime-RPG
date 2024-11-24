export interface DomainStats {
  domain: string;
  timeSpent: number;
  level: number;
  experience: number;
  lastVisit: number;
}

export interface DomainData {
  [domain: string]: DomainStats;
}