export interface Timing {
  open: string;
  close: string;
}

export interface SeasonTimings {
  morning: Timing;
  evening: Timing;
}

export interface Aarti {
  name: string;
  time: string;
}

export interface Temple {
  id: number;
  name: string;
  specialty: string;
  pro_tip: string;
  visitor_count: number;
  last_verified: string;
  maps_url: string;
  image: string;
  timings: {
    summer: SeasonTimings;
    winter: SeasonTimings;
  };
  aarti: Aarti[];
}
