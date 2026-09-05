export type Need = {
  id: string;
  title: string;
  category: string;
  location: string;
  urgency: "High" | "Medium" | "Low";
  beneficiaries: number;
  progress: number;
  pledged: number;
  goal: number;
  contributors: number;
  verification: "Verified" | "Review pending";
  summary: string;
  story: string;
  need: string;
  image: string;
  types: string[];
  updated: string;
  outcome?: { headline: string; detail: string };
};

export const demoLabel = "Fictional Kenyan community demo data";

export const needs: Need[] = [
  {
    id: "desks-kijiji",
    title: "20 desks for Kijiji Community School",
    category: "Education",
    location: "Kiambu",
    urgency: "High",
    beneficiaries: 42,
    progress: 80,
    pledged: 24000,
    goal: 30000,
    contributors: 12,
    verification: "Verified",
    summary: "Kijiji Community School is preparing 20 desks so 42 learners can study with comfort and dignity before the next term.",
    story: "Learners at this fictional community school currently share a small number of desks and some sit on the floor. The school community is coordinating a practical, trackable request for furniture.",
    need: "20 durable classroom desks",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
    types: ["Money", "Items", "Skills", "Logistics"],
    updated: "2 days ago",
  },
  {
    id: "water-matunda",
    title: "Rainwater tanks for Matunda neighbourhood",
    category: "Community",
    location: "Nakuru",
    urgency: "Medium",
    beneficiaries: 118,
    progress: 55,
    pledged: 82500,
    goal: 150000,
    contributors: 24,
    verification: "Verified",
    summary: "Two rainwater tanks will give a fictional Matunda neighbourhood a more reliable source for shared community use.",
    story: "Residents have identified water storage as a practical way to make the community centre useful beyond the rainy season. Contributions can be financial, material, or logistical.",
    need: "2 × 10,000 litre rainwater tanks",
    image: "https://images.unsplash.com/photo-1541919329513-35f7af297129?auto=format&fit=crop&w=1200&q=80",
    types: ["Money", "Items", "Logistics"],
    updated: "4 days ago",
  },
  {
    id: "mobility-kibera",
    title: "Mobility equipment for a community clinic",
    category: "Health",
    location: "Nairobi",
    urgency: "High",
    beneficiaries: 31,
    progress: 36,
    pledged: 18000,
    goal: 50000,
    contributors: 8,
    verification: "Review pending",
    summary: "A fictional community clinic is seeking mobility equipment to make appointments and rehabilitation sessions more accessible.",
    story: "The clinic team has identified a gap in practical equipment for people with temporary or permanent mobility needs. This request is currently review pending and is not independently verified.",
    need: "2 wheelchairs, 1 walker, and transfer support",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    types: ["Money", "Items", "Professional services"],
    updated: "Yesterday",
  },
  {
    id: "trees-rongai",
    title: "Native tree planting day in Rongai",
    category: "Environment",
    location: "Kajiado",
    urgency: "Low",
    beneficiaries: 76,
    progress: 100,
    pledged: 42000,
    goal: 42000,
    contributors: 19,
    verification: "Verified",
    summary: "A volunteer-led planting day has restored a shared green space with 300 native seedlings and a plan for aftercare.",
    story: "This fictional neighbourhood group organised seedlings, transport, and volunteer time around a small restoration project. The outcome has been reported to close the loop.",
    need: "300 native seedlings, tools, and volunteer time",
    image: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=80",
    types: ["Items", "Time", "Logistics"],
    updated: "1 week ago",
    outcome: { headline: "300 seedlings planted", detail: "76 residents joined the planting and an aftercare rota is now active." },
  },
];

export const activity = [
  { label: "New pledge", detail: "3 desks pledged to Kijiji Community School", time: "18 min ago", tone: "terracotta" },
  { label: "Outcome reported", detail: "Rongai planting day closed with 300 seedlings planted", time: "2 h ago", tone: "sage" },
  { label: "Need approved", detail: "Rainwater tanks for Matunda neighbourhood", time: "Yesterday", tone: "ochre" },
];

export const formatKsh = (value: number) => `KSh ${value.toLocaleString("en-KE")}`;
