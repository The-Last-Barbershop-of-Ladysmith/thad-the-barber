/** 0 = Sunday … 6 = Saturday, matching Date.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface OpeningHours {
  day: Weekday;
  /** Minutes after midnight. */
  opensAt: number;
  closesAt: number;
}

export interface HoursRow {
  label: string;
  shortLabel: string;
  /** "10:00 AM – 7:00 PM" */
  range: string;
  /** "10 AM – 7 PM" */
  shortRange: string;
  closed: boolean;
}

export interface OpenStatus {
  isOpen: boolean;
  label: string;
}

export interface SocialLink {
  label: string;
  icon: string;
  href: string;
}

export interface NavItem {
  label: string;
  fragment: string;
}

export interface ShopInfo {
  name: string;
  tagline: string;
  area: string;
  phone: {
    display: string;
    tel: string;
    sms: string;
  };
  location: {
    venue: string;
    street: string;
    cityLine: string;
    mapEmbedUrl: string;
    directionsUrl: string;
  };
  reviews: {
    score: number;
    count: number;
    source: string;
  };
}
