export interface DomainStats {
  domain: string;
  timeSpent: number;
  level: number;
  experience: number;
  lastVisit: number;
  displayName?: string;
  isActive?: boolean;
  todayTimeSpent?: number;
  todayStartTime?: number;
}

export interface DomainData {
  [domain: string]: DomainStats;
}