export type Program = {
  slug: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
};

export const programs: Program[] = [
  {
    slug: "yoga",
    name: "Yoga",
    description: "Take a breath, find your balance, and move at your own pace.",
    image: "/images/community/kmax-yoga.webp",
    imageAlt: "Members taking part in a yoga session at KMAX Fitness",
  },
  {
    slug: "pilates",
    name: "Pilates",
    description: "A focused movement session built around control and awareness.",
    image: "/images/community/kmax-yoga-class.webp",
    imageAlt: "A group moving together on exercise mats at KMAX Fitness",
  },
  {
    slug: "piloxing",
    name: "Piloxing",
    description: "A group class from the KMAX community program lineup.",
    image: "/images/community/kmax-floor-workout.webp",
    imageAlt: "Members training together on the KMAX floor",
  },
  {
    slug: "maxfit",
    name: "MAXFIT",
    description: "Move with the group and make the session your own.",
    image: "/images/community/kmax-group-session.webp",
    imageAlt: "A KMAX group session in the gym",
  },
  {
    slug: "s45",
    name: "S45",
    description: "A KMAX group fitness format shown in the gym’s class posts.",
    image: "/images/community/kmax-floor-workout.webp",
    imageAlt: "Members sharing the workout floor at KMAX Fitness",
  },
  {
    slug: "hiit",
    name: "HIIT",
    description: "A group workout for anyone ready to move alongside the community.",
    image: "/images/community/kmax-group-session.webp",
    imageAlt: "A group workout inside KMAX Fitness",
  },
  {
    slug: "taekwondo",
    name: "Taekwondo",
    description: "Martial arts training is part of the KMAX community mix.",
    image: "/images/community/kmax-community-group.webp",
    imageAlt: "The KMAX community gathered at the gym",
  },
];

export type DemoMember = {
  id: string;
  name: string;
  mobile: string;
  status: "Active" | "Expiring soon" | "Expired";
  ends: string;
};

export const demoMembers: DemoMember[] = [
  { id: "KM-2041", name: "Mika Santos", mobile: "09•• ••• ••14", status: "Active", ends: "Dec 18, 2026" },
  { id: "KM-2038", name: "Paolo Reyes", mobile: "09•• ••• ••72", status: "Expiring soon", ends: "Nov 08, 2026" },
  { id: "KM-2034", name: "Leah Navarro", mobile: "09•• ••• ••29", status: "Active", ends: "Jan 04, 2027" },
  { id: "KM-2029", name: "Marco Villanueva", mobile: "09•• ••• ••51", status: "Expired", ends: "Oct 24, 2026" },
  { id: "KM-2025", name: "Nina Santiago", mobile: "09•• ••• ••83", status: "Expiring soon", ends: "Nov 10, 2026" },
  { id: "KM-2018", name: "Andre Cruz", mobile: "09•• ••• ••06", status: "Active", ends: "Feb 02, 2027" },
  { id: "KM-2011", name: "Jessa Flores", mobile: "09•• ••• ••43", status: "Active", ends: "Dec 02, 2026" },
  { id: "KM-2004", name: "Luca Mendoza", mobile: "09•• ••• ••95", status: "Expiring soon", ends: "Nov 12, 2026" },
];

export const demoMembershipStats = {
  activeMembers: 212,
  expiringSoon: 14,
  expired: 9,
  newThisMonth: 18,
};

export const demoSales = [
  { day: "Mon", amount: 8100 },
  { day: "Tue", amount: 7240 },
  { day: "Wed", amount: 8850 },
  { day: "Thu", amount: 6300 },
  { day: "Fri", amount: 9180 },
  { day: "Sat", amount: 5240 },
  { day: "Sun", amount: 2760 },
];

export const demoSalesTotal = demoSales.reduce((total, sale) => total + sale.amount, 0);
