import { ClientStatus } from "../../../src/generated/client";

export interface ClientSeedRecord {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  status: ClientStatus;
  notes?: string;
}

export const CLIENT_SEED_DATA: readonly ClientSeedRecord[] = [
  {
    companyName: "Acme Corporation",
    contactName: "Jane Cooper",
    email: "jane.cooper@acmecorp.com",
    phone: "+1 415 555 0142",
    website: "https://acmecorp.example",
    addressLine1: "100 Market Street",
    city: "San Francisco",
    country: "United States",
    status: ClientStatus.ACTIVE,
    notes: "Enterprise retainer — primary contact for billing.",
  },
  {
    companyName: "Nova Labs",
    contactName: "Omar Hassan",
    email: "omar@novalabs.io",
    phone: "+971 4 555 0199",
    website: "https://novalabs.example",
    city: "Dubai",
    country: "United Arab Emirates",
    status: ClientStatus.ACTIVE,
  },
  {
    companyName: "Brightside Media",
    contactName: "Emily Chen",
    email: "emily@brightsidemedia.com",
    phone: "+1 646 555 0177",
    city: "New York",
    country: "United States",
    status: ClientStatus.LEAD,
    notes: "Discovery call scheduled next week.",
  },
  {
    companyName: "Orbit Logistics",
    contactName: "Carlos Mendes",
    email: "carlos@orbitlogistics.com",
    city: "Lisbon",
    country: "Portugal",
    status: ClientStatus.INACTIVE,
    notes: "Paused engagement — revisit in Q4.",
  },
];
