require('dotenv').config();
const mongoose = require('mongoose');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);

    const PathwayContent = require('../models/PathwayContent');
    const PathwayConfig  = require('../models/PathwayConfig');
    const User           = require('../models/User');

    const admin = await User.findOne({ isAdmin: true }).lean()
               || await User.findOne({}).lean();
    const createdBy = admin._id;

    await PathwayContent.deleteMany({ pathway: 'web3_jobs' });

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const items = [
        // LIVE NOW
        {
            pathway: 'web3_jobs', section: 'class',
            title: 'Office Hours — Ask Me Anything',
            body: 'Drop in live and ask anything about landing a Web3 job. No prep needed.',
            isLive: true,
            venue: 'Google Meet (Online)',
            externalUrl: 'https://t.me/onboard3hq',
            isPublished: true, createdBy
        },
        // UPDATE
        {
            pathway: 'web3_jobs', section: 'update',
            title: 'Welcome to Web3 Jobs Pathway 🚀',
            body: 'This pathway is your shortcut to landing a Web3 job. Every week we share live classes, job openings, and resources. Stay locked in.',
            isPinned: true, isPublished: true, createdBy
        },
        {
            pathway: 'web3_jobs', section: 'update',
            title: '5 Web3 Companies Actively Hiring in Africa Right Now',
            body: 'Checked job boards this week — here are 5 legit roles open to African talent with no relocation required.',
            externalUrl: 'https://web3.career',
            isPublished: true, createdBy
        },
        // CLASSES
        {
            pathway: 'web3_jobs', section: 'class',
            title: 'How to Write a Web3 CV That Gets Noticed',
            body: 'Step-by-step session covering what Web3 hiring managers actually look for, what to cut, and what to add.',
            scheduledAt: new Date(now + 2 * day),
            endsAt: new Date(now + 2 * day + 2 * 60 * 60 * 1000),
            venue: 'Zoom (Online)',
            externalUrl: 'https://meet.google.com',
            isPublished: true, createdBy
        },
        {
            pathway: 'web3_jobs', section: 'class',
            title: 'Web3 Interview Prep — Live Mock Session',
            body: 'We simulate real Web3 job interviews: technical + culture fit. You\'ll get live feedback.',
            scheduledAt: new Date(now + 7 * day),
            endsAt: new Date(now + 7 * day + 90 * 60 * 1000),
            venue: 'Google Meet (Online)',
            externalUrl: 'https://meet.google.com',
            isPublished: true, createdBy
        },
        // RESOURCES
        {
            pathway: 'web3_jobs', section: 'resource',
            title: 'Web3 CV Template (Google Docs)',
            body: 'Copy this template and fill in your details. Designed specifically for Web3 applications.',
            resourceUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
            resourceType: 'doc',
            resourceFilename: 'Web3 CV Template.docx',
            isPublished: true, createdBy
        },
        {
            pathway: 'web3_jobs', section: 'resource',
            title: 'Top 30 Web3 Job Boards',
            body: 'Curated list of job boards where Web3 companies post roles — crypto-native and remote-friendly.',
            resourceUrl: 'https://web3.career',
            resourceType: 'link',
            isPinned: true,
            isPublished: true, createdBy
        },
        {
            pathway: 'web3_jobs', section: 'resource',
            title: 'Web3 Skills Roadmap 2026 (PDF)',
            body: 'Visual roadmap of the most in-demand Web3 skills by job role: developer, designer, community, marketing.',
            resourceUrl: 'https://roadmap.sh/blockchain',
            resourceType: 'pdf',
            resourceFilename: 'Web3 Skills Roadmap 2026.pdf',
            isPublished: true, createdBy
        },
        // OPPORTUNITIES
        {
            pathway: 'web3_jobs', section: 'opportunity',
            title: 'Smart Contract Developer — DeFi Protocol (Remote)',
            body: '2+ yrs Solidity. Competitive USD salary + token allocation. Fully remote, Africa-friendly timezone.',
            opportunityType: 'job',
            externalUrl: 'https://jobs.lever.co',
            isPublished: true, createdBy
        },
        {
            pathway: 'web3_jobs', section: 'opportunity',
            title: 'Community Manager — NFT Marketplace (Internship)',
            body: 'Paid 3-month remote internship. Discord & Twitter growth. Perfect entry-level Web3 role.',
            opportunityType: 'internship',
            externalUrl: 'https://apply.workable.com',
            isPublished: true, createdBy
        },
        {
            pathway: 'web3_jobs', section: 'opportunity',
            title: 'Content Gig — Write 5 Web3 Explainer Threads',
            body: '$50 per thread. Long-form Twitter/X threads explaining DeFi concepts. Apply with 1 sample.',
            opportunityType: 'gig',
            externalUrl: 'https://t.me/onboard3hq',
            isPublished: true, createdBy
        },
        // EVENT
        {
            pathway: 'web3_jobs', section: 'event',
            title: 'Web3 Job Fair — Lagos & Virtual',
            body: 'Network with 20+ Web3 companies hiring in Nigeria and across Africa. Free to attend. Virtual link available.',
            scheduledAt: new Date(now + 14 * day),
            endsAt: new Date(now + 14 * day + 4 * 60 * 60 * 1000),
            venue: 'The Hive Lagos + Virtual',
            externalUrl: 'https://lu.ma/web3jobfair',
            isPublished: true, createdBy
        }
    ];

    const result = await PathwayContent.insertMany(items);
    console.log(`✅ Seeded ${result.length} items for web3_jobs pathway`);

    // Upsert a basic config for web3_jobs if none exists
    await PathwayConfig.findOneAndUpdate(
        { pathway: 'web3_jobs' },
        { $setOnInsert: { pathway: 'web3_jobs', tagline: 'Find and land your Web3 job.', groupLink: null, xLink: null } },
        { upsert: true }
    );

    await mongoose.disconnect();
    console.log('Done.');
}

seed().catch(err => { console.error(err); process.exit(1); });
