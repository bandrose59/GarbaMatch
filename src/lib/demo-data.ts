export type Interest =
  | "Garba"
  | "Dance"
  | "Music"
  | "Photography"
  | "Food stalls"
  | "College events"
  | "Travel"
  | "Fashion"
  | "Art"
  | "Sports"
  | "Movies"
  | "Cafes"
  | "Festivals"
  | "Other";

export type DiscoveryMode = "A dance partner" | "A friend to attend with" | "A group to join";
export type GarbaExperience = "Beginner" | "Learning the steps" | "Love dancing" | "Experienced dancer";
export type GarbaStyle = "Traditional" | "Fusion" | "Both";
export type EventTiming = "Before 7 PM" | "7–9 PM" | "After 9 PM" | "Flexible";

export type Profile = {
  id: string;
  name: string;
  branch: string;
  year: string;
  bio: string;
  avatar: string;
  interests: Interest[];
  experience: GarbaExperience;
  style: GarbaStyle;
  preferredTiming: EventTiming[];
  instagram?: string;
  connectionStatus: "new" | "matched" | "connected" | "pending";
  matchScore?: number;
};

export const currentUser = {
  id: "me",
  name: "Aanya" ,
  branch: "Computer Science",
  year: "Third Year",
  bio: "Always ready for late-night dandiya and post-event chai runs.",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
  interests: ["Garba", "Dance", "Music", "Food stalls", "Festivals"],
  experience: "Love dancing" as GarbaExperience,
  style: "Both" as GarbaStyle,
  preferredTiming: ["7–9 PM", "Flexible"] as EventTiming[],
  instagram: "@aanya.dandiya",
};

export const demoProfiles: Profile[] = [
  {
    id: "p1",
    name: "Riya Patel",
    branch: "Electronics",
    year: "Second Year",
    bio: "Love learning the steps and posting reel-worthy dance floor moments.",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    interests: ["Garba", "Dance", "Music", "Photography"],
    experience: "Learning the steps",
    style: "Traditional",
    preferredTiming: ["7–9 PM"],
    connectionStatus: "new",
    matchScore: 92,
  },
  {
    id: "p2",
    name: "Ishita Shah",
    branch: "Mechanical",
    year: "Final Year",
    bio: "Chai breaks, concert playlists, and a serious commitment to festive fun.",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    interests: ["Music", "Travel", "Food stalls", "Festivals"],
    experience: "Experienced dancer",
    style: "Fusion",
    preferredTiming: ["After 9 PM", "Flexible"],
    connectionStatus: "new",
    matchScore: 88,
  },
  {
    id: "p3",
    name: "Meher Joshi",
    branch: "IT",
    year: "Third Year",
    bio: "Bringing the energy to every college event and always looking for a dance-ready crew.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    interests: ["College events", "Art", "Dance", "Cafes"],
    experience: "Love dancing",
    style: "Both",
    preferredTiming: ["Before 7 PM", "7–9 PM"],
    connectionStatus: "new",
    matchScore: 90,
  },
  {
    id: "p4",
    name: "Kavya Verma",
    branch: "Civil",
    year: "Second Year",
    bio: "Enjoying dandiya, spontaneous road trips, and venue-hopping with friends.",
    avatar: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    interests: ["Travel", "Photography", "Garba", "Fashion"],
    experience: "Beginner",
    style: "Traditional",
    preferredTiming: ["7–9 PM"],
    connectionStatus: "new",
    matchScore: 85,
  },
];

export const demoMatches = [
  {
    id: "m1",
    name: "Riya Patel",
    branch: "Electronics",
    year: "Second Year",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    mutualInterests: ["Garba", "Dance", "Music"],
    timestamp: "Today, 7:30 PM",
    connectionStatus: "connected",
    instagram: "@riyapatel_",
  },
  {
    id: "m2",
    name: "Meher Joshi",
    branch: "IT",
    year: "Third Year",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    mutualInterests: ["College events", "Dance", "Cafes"],
    timestamp: "Yesterday",
    connectionStatus: "pending",
    instagram: null,
  },
];

export const events = [
  {
    slug: "navratri-night-spark",
    name: "Navratri Night Spark",
    date: "October 24, 2026",
    time: "7:00 PM – 11:30 PM",
    venue: "Main Auditorium Lawn",
    address: "SGGS Nanded Campus, Main Gate Road",
    description:
      "A vibrant campus celebration with live dandiya, DJ mixes, and a sunset cultural show.",
    price: "₹150",
    organizer: "Cultural Council",
    image:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
    ticketUrl: "https://example.com/booking",
  },
  {
    slug: "raas-rhythm-fest",
    name: "Raas Rhythm Fest",
    date: "October 28, 2026",
    time: "6:30 PM – 10:45 PM",
    venue: "Open Air Stage",
    address: "Boys Hostel Quadrangle",
    description: "Dandiya competition, folk music, and food-truck village meet-up for campus students.",
    price: "₹200",
    organizer: "Student Union",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
    ticketUrl: "https://example.com/booking2",
  },
];

export const adminMetrics = {
  totalStudents: 1842,
  verified: 1468,
  pending: 34,
  reports: 11,
};

export const verificationQueue = [
  { name: "Sana Khan", email: "sana@sggs.ac.in", status: "Pending" },
  { name: "Nimisha Rao", email: "nimisha@sggs.ac.in", status: "Manual review" },
  { name: "Kabir Jain", email: "kabir@gmail.com", status: "ID proof requested" },
];

export const reports = [
  { name: "Aarav S", type: "Harassment", severity: "High" },
  { name: "Pooja M", type: "Fake profile", severity: "Medium" },
];
