require('dotenv').config();
const mongoose = require('mongoose');
const AcademyCohort = require('../models/AcademyCohort');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await AcademyCohort.deleteMany({ slug: 'web3-careers-cohort-01' });

  const cohort = await AcademyCohort.create({
    title: 'Web3 Careers Cohort 01',
    slug: 'web3-careers-cohort-01',
    topic: 'Web3 Careers',
    duration: '4 Weeks',
    description: 'Your fast track from zero to your first Web3 job. Learn how the industry works, where the opportunities are, and how to position yourself to land roles — with live coaching and real mentors.',
    status: 'applications_open',
    seats: 40,
    applicationDeadline: new Date('2026-10-10'),
    startDate: new Date('2026-10-20'),
    endDate: new Date('2026-11-17'),
    telegramChannelLink: 'https://t.me/onboard3academy',
    whatYoullLearn: [
      'How Web3 companies are structured and where jobs live',
      'How to write a Web3-ready CV and portfolio',
      'How to find and apply for crypto-native roles',
      'Community, DAO, and protocol career paths',
      'How to network and get referrals in Web3',
    ],
    requirements: 'A working internet connection, a Telegram account, and genuine interest in breaking into Web3. No prior crypto experience required.',
    admissionChallenge: 'In 3–5 sentences, describe one Web3 project or company you find interesting and why you think it represents an opportunity.',
    instructors: [
      {
        name: 'Abdol',
        bio: 'Founder of ONBOARD3. Has helped hundreds of people land their first Web3 roles.',
        twitter: '@onboard3hq',
        avatar: ''
      }
    ],
    weeklySchedule: [
      {
        week: 1,
        theme: 'Understanding the Web3 Job Market',
        topics: ['How Web3 orgs are structured', 'Where to find jobs', 'Types of Web3 roles'],
        daySchedule: [
          { day: 'Monday', activity: 'Week 1 announcement + reading material' },
          { day: 'Tuesday', activity: 'Live class: The Web3 job landscape' },
          { day: 'Wednesday', activity: 'Practical: Research 3 companies in your niche' },
          { day: 'Thursday', activity: 'Q&A session' },
          { day: 'Friday', activity: 'Assignment deadline' },
        ],
        resources: [
          { name: 'Web3 Job Market Guide', url: 'https://onboard3.com', type: 'link' }
        ],
        assignment: { title: 'Company Research', description: 'Find 3 Web3 companies hiring right now in your target role. List the company, role, and where the job was posted.', required: true }
      },
      {
        week: 2,
        theme: 'Building Your Web3 Identity',
        topics: ['CV & portfolio for Web3', 'Twitter/X presence', 'On-chain credentials'],
        daySchedule: [
          { day: 'Monday', activity: 'Week 2 materials dropped' },
          { day: 'Tuesday', activity: 'Live class: Stand out in Web3 applications' },
          { day: 'Wednesday', activity: 'Practical: Revise your bio + CV section' },
          { day: 'Thursday', activity: 'Peer review session' },
          { day: 'Friday', activity: 'Assignment deadline' },
        ],
        resources: [],
        assignment: { title: 'CV & Profile Audit', description: 'Submit your updated Web3 CV (PDF/link) and Twitter/X bio for review.', required: true }
      },
      {
        week: 3,
        theme: 'Applying & Getting Noticed',
        topics: ['Cold outreach', 'Contributor paths', 'DAO onboarding'],
        daySchedule: [
          { day: 'Monday', activity: 'Materials + week 3 kick-off' },
          { day: 'Tuesday', activity: 'Live class: Getting noticed in Web3 communities' },
          { day: 'Wednesday', activity: 'Practical: Send 5 cold applications or DMs' },
          { day: 'Thursday', activity: 'Q&A + hot seats' },
          { day: 'Friday', activity: 'Assignment deadline' },
        ],
        resources: [],
        assignment: { title: 'Outreach Log', description: 'Share a log of 5 applications or outreach messages sent this week (screenshots or a doc).', required: true }
      },
      {
        week: 4,
        theme: 'Interviews, Offers & Getting Hired',
        topics: ['Common Web3 interview formats', 'Negotiating offers', 'Building long-term career momentum'],
        daySchedule: [
          { day: 'Monday', activity: 'Final week materials' },
          { day: 'Tuesday', activity: 'Live class: Closing the deal' },
          { day: 'Wednesday', activity: 'Mock interview practice' },
          { day: 'Thursday', activity: 'Final Q&A + graduation prep' },
          { day: 'Friday', activity: 'Final assignment deadline' },
        ],
        resources: [],
        assignment: { title: 'Final Reflection', description: 'Write a short paragraph on your biggest takeaway from the cohort and your next concrete step.', required: true }
      }
    ]
  });

  console.log('Seeded cohort:', cohort.title, '—', cohort.slug);
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
