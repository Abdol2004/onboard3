const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Event = require("../models/Event");

dotenv.config();

// Sample events data
const sampleEvents = [
  {
    title: "Onboard3 Virtual Meetup",
    description: "48-hour virtual hackathon focused on building innovative DeFi solutions. Compete for $50K in prizes and connect with top Web3 builders.",
    eventType: "virtual", 
    category: "hackathon",
    virtualLink: "https://meet.google.com/defi-hack-2025",
    startDate: new Date("2025-11-20T09:00:00"),
    endDate: new Date("2025-11-22T18:00:00"),
    startTime: "9:00 AM",
    endTime: "6:00 PM",
    timezone: "WAT",
    prizePool: "$50,000 USDC",
    status: "upcoming",
    tags: ["zsdsdDeFi", "Hackathon", "Smart Contracts"],
    requirements: [
      "Basic knowledge of Solidity",
      "Experience with Web3 development",
      "Team of 2-5 members"
    ],
    agenda: [
      { time: "9:00 AM", activity: "Opening Ceremony & Project Pitches" },
      { time: "10:00 AM", activity: "Hacking Begins" },
      { time: "2:00 PM", activity: "Mentor Office Hours" },
      { time: "5:00 PM", activity: "Day 1 Check-in" }
    ],
    speakers: [
      {
        name: "John Doe",
        title: "Lead DeFi Developer at Uniswap",
        bio: "10+ years experience in blockchain development",
        image: ""
      }
    ]
  },
  {
    title: "Smart Contract Security Workshop",
    description: "Learn best practices for secure smart contract development. Interactive workshop covering common vulnerabilities and how to prevent them.",
    eventType: "virtual",
    category: "workshop",
    virtualLink: "https://zoom.us/j/smartcontract-security",
    startDate: new Date("2025-12-01T16:00:00"),
    endDate: new Date("2025-12-01T19:00:00"),
    startTime: "4:00 PM",
    endTime: "7:00 PM",
    timezone: "WAT",
    status: "upcoming",
    tags: ["Security", "Smart Contracts", "Workshop"],
    requirements: [
      "Laptop with development environment",
      "Basic Solidity knowledge"
    ],
    agenda: [
      { time: "4:00 PM", activity: "Introduction to Smart Contract Security" },
      { time: "4:30 PM", activity: "Common Vulnerabilities (Reentrancy, Integer Overflow)" },
      { time: "5:30 PM", activity: "Hands-on Lab: Auditing Smart Contracts" },
      { time: "6:30 PM", activity: "Q&A Session" }
    ]
  },
  {
    title: "NFT Art Exhibition",
    description: "Showcase your NFT art and connect with collectors. Physical exhibition featuring the best Web3 artists in Lagos.",
    eventType: "physical",
    category: "exhibition",
    venue: "Art Gallery, Lekki Phase 1, Lagos",
    startDate: new Date("2025-12-10T17:00:00"),
    endDate: new Date("2025-12-10T21:00:00"),
    startTime: "5:00 PM",
    endTime: "9:00 PM",
    timezone: "WAT",
    status: "upcoming",
    tags: ["NFT", "Art", "Exhibition"],
    requirements: [
      "RSVP required",
      "Bring valid ID"
    ]
  },
  {
    title: "Web3 Builder Meetup - Lagos",
    description: "Monthly meetup for Web3 builders, developers, and enthusiasts. Network with like-minded individuals and share your projects.",
    eventType: "physical",
    category: "meetup",
    venue: "Co-Creation Hub, Yaba, Lagos",
    startDate: new Date("2025-10-20T14:00:00"),
    endDate: new Date("2025-10-20T18:00:00"),
    startTime: "2:00 PM",
    endTime: "6:00 PM",
    timezone: "WAT",
    status: "upcoming",
    tags: ["Networking", "Meetup", "Community"],
    agenda: [
      { time: "2:00 PM", activity: "Registration & Networking" },
      { time: "2:30 PM", activity: "Lightning Talks" },
      { time: "3:30 PM", activity: "Panel Discussion: Future of Web3 in Africa" },
      { time: "5:00 PM", activity: "Open Networking & Refreshments" }
    ]
  },
  {
    title: "Web3 Onboarding Workshop",
    description: "Introduction to Web3 technologies for beginners. Learn about blockchain, cryptocurrencies, and decentralized applications.",
    eventType: "hybrid",
    category: "workshop",
    venue: "ONBOARD3 Hub, Ibadan",
    virtualLink: "https://meet.google.com/web3-onboarding",
    startDate: new Date("2025-09-15T10:00:00"),
    endDate: new Date("2025-09-15T16:00:00"),
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    timezone: "WAT",
    status: "completed",
    tags: ["Beginner", "Workshop", "Education"],
    registrations: []
  },
  {
    title: "Smart Contract Bootcamp",
    description: "Intensive 2-day bootcamp covering Solidity programming and smart contract development.",
    eventType: "physical",
    category: "workshop",
    venue: "Tech Hub, Victoria Island, Lagos",
    startDate: new Date("2025-08-20T09:00:00"),
    endDate: new Date("2025-08-21T17:00:00"),
    startTime: "9:00 AM",
    endTime: "5:00 PM",
    timezone: "WAT",
    status: "completed",
    tags: ["Bootcamp", "Solidity", "Development"],
    registrations: []
  }
];

async function seedEvents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // Clear existing events (optional - comment out if you want to keep existing events)
    await Event.deleteMany({});
    console.log("Cleared existing events");

    // Insert sample events
    const events = await Event.insertMany(sampleEvents);
    console.log(`✅ Successfully seeded ${events.length} events`);

    events.forEach(event => {
      console.log(`- ${event.title} (${event.status})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding events:", error);
    process.exit(1);
  }
}

seedEvents();