const mongoose = require('mongoose');
const Quest = require('./models/Quest');

const MONGODB_URI = 'mongodb+srv://abdulfatahabdol2003_db_user:Abdol2020@cluster0.gzq1b1p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function createBeginnerQuest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const beginnerQuest = new Quest({
      title: "🎯 Web3 Fundamentals - Your Complete Onboarding Journey",
      description: "Master Web3 basics, understand how to make money in the decentralized economy, and join our vibrant community. This educational quest will set you up for success in Web3!",
      shortDescription: "Learn Web3 fundamentals and start your journey!",
      category: "learning",
      difficulty: "beginner",
      estimatedDuration: "30-40 minutes",
      baseXpReward: 500,
      isActive: true,
      startDate: new Date(),
      endDate: null,
      questType: "permanent",
      referralConfig: {
        enabled: false,
        xpPerReferralJoin: 0,
        xpPerReferralComplete: 0
      },
      competitionConfig: {
        enabled: false,
        topWinnersCount: 0,
        winnerBonusXP: 0
      },
      tasks: [
        {
          title: "📚 Understanding Web3: The Internet's Next Chapter",
          description: `WHAT IS WEB3?

Web3 represents the third generation of the internet, built on blockchain technology. Let's break it down:

WEB1 (1990s-2004): Read-Only Internet
→ Static websites like newspapers
→ You could only view content
→ Examples: Early Yahoo, GeoCities

WEB2 (2004-Present): Read-Write Internet
→ Social media and user-generated content
→ You can create and share
→ Examples: Facebook, YouTube, Twitter
→ Problem: Big companies own your data and content

WEB3 (Now-Future): Read-Write-Own Internet
→ You own your data, content, and digital assets
→ No middleman controlling everything
→ Powered by blockchain technology
→ Examples: Cryptocurrency, NFTs, Decentralized Apps (dApps)

KEY CONCEPTS YOU NEED TO KNOW:

1. DECENTRALIZATION
Instead of one company controlling everything (like Facebook owns your posts), power is distributed across many computers worldwide. No single authority can shut it down or control it.

2. BLOCKCHAIN
Think of it as a digital ledger that everyone can see but no one can cheat. Every transaction is recorded permanently and transparently.

3. OWNERSHIP
In Web3, you truly own your digital assets. If you buy an NFT or earn cryptocurrency, it's yours - no company can take it away.

4. TRANSPARENCY
All transactions are public and verifiable. This builds trust without needing a middleman.

WHY WEB3 MATTERS FOR YOU:

✅ TRUE OWNERSHIP: Your content, your data, your assets
✅ FINANCIAL FREEDOM: Access global financial services without banks
✅ NEW OPPORTUNITIES: Jobs and income streams that didn't exist before
✅ PRIVACY CONTROL: You decide what to share and with whom
✅ GLOBAL ACCESS: Anyone with internet can participate
✅ INNOVATION: Be part of the next internet revolution

REAL-WORLD WEB3 APPLICATIONS:

→ DeFi (Decentralized Finance): Banking without banks
→ NFTs: Digital art, collectibles, and ownership proof
→ DAOs: Communities that make decisions together
→ Metaverse: Virtual worlds you can truly own assets in
→ Play-to-Earn Games: Get paid for gaming
→ Creator Economy: Artists and creators earning directly from fans`,
          order: 1,
          taskType: "quiz",
          xpReward: 150,
          isDaily: false,
          inputLabel: "QUIZ: What makes Web3 different from Web2? (Answer with ONE word: ownership, decentralization, or blockchain)",
          inputName: "web3_fundamentals",
          requirements: { action: "ownership" }
        },
        {
          title: "💰 How to Make Money in Web3: Complete Guide",
          description: `THE WEB3 ECONOMY: YOUR OPPORTUNITIES TO EARN

Web3 isn't just technology - it's a NEW ECONOMY with multiple ways to generate income. Here's your complete guide:

═══════════════════════════════════════

1. WEB3 JOBS & CAREERS 💼

The Web3 industry is hiring! Here are in-demand roles:

TECHNICAL ROLES:
→ Blockchain Developer: $80k-$200k/year
   Build smart contracts and dApps
   Learn: Solidity, Rust, JavaScript

→ Smart Contract Auditor: $100k-$250k/year
   Find security bugs in blockchain code
   Learn: Security, Solidity, Testing

→ Full-Stack Web3 Developer: $70k-$180k/year
   Build front-end for dApps
   Learn: React, Web3.js, Ethers.js

NON-TECHNICAL ROLES:
→ Community Manager: $40k-$100k/year
→ Content Creator/Writer: $10k-$80k/year
→ Marketing Specialist: $50k-$120k/year
→ Discord/Telegram Moderator: $2k-$30k/year
→ Product Manager: $80k-$180k/year

WHERE TO FIND WEB3 JOBS:
• Onboard3 Job Board (Coming Soon!) 🎉
• Social media platform like : X,Telegram and Discord;
• Web3.career
• AngelList (Crypto startups)

═══════════════════════════════════════

2. AIRDROPS 🪂

Free cryptocurrency tokens given to early users!

HOW IT WORKS:
Companies reward early adopters who use their product before launch.

FAMOUS AIRDROPS:
→ Uniswap: $6,000+ for early users
→ Aptos: $2,000+ per wallet
→ Arbitrum: $10,000+ for active users
→ dYdX: $5,000+ average

HOW TO GET AIRDROPS:
✓ Use new protocols early (DeFi, NFT platforms)
✓ Interact with testnets
✓ Follow projects on Twitter
✓ Join Discord communities
✓ Complete on-chain transactions
✓ Hold specific NFTs or tokens

AIRDROP STRATEGY:
1. Research upcoming projects
2. Use their testnet/product early
3. Make real transactions (small amounts)
4. Be an active community member
5. Wait for token launch announcement
6. Talk about them

═══════════════════════════════════════

3. BOUNTIES 🎯

Get paid for completing specific tasks!

TYPES OF BOUNTIES:
→ Bug Bounties: $500-$500,000
   Find security vulnerabilities

→ Content Bounties: $50-$5,000
   Write articles, create videos, design graphics

→ Development Bounties: $1,000-$50,000
   Build features or tools

→ Translation Bounties: $100-$2,000
   Translate documentation

WHERE TO FIND BOUNTIES:
• Onboard3 Bounty Board (Coming Soon!) 🚀
• Gitcoin.co
• Layer3.xyz
• Galxe.com
• Immunefi.com (Security)

═══════════════════════════════════════

4. PLAY-TO-EARN (P2E) GAMES 🎮

Earn cryptocurrency by playing games!

POPULAR P2E GAMES:
→ Axie Infinity: $200-$1,000/month potential
→ The Sandbox: Buy virtual land, create experiences
→ Decentraland: Rent properties, host events
→ Gods Unchained: Trade valuable cards
→ Illuvium: Capture creatures, battle others

═══════════════════════════════════════

5. NFT TRADING & CREATION 🎨

Create or trade digital art and collectibles

WAYS TO EARN:
→ Create NFT Art: Sell your designs
→ Flip NFTs: Buy low, sell high
→ NFT Staking: Earn rewards for holding
→ Community Whitelist: Get early access to new drops

═══════════════════════════════════════

6. DEFI (DECENTRALIZED FINANCE) 💵

Earn passive income with your crypto

OPPORTUNITIES:
→ Staking: Lock crypto, earn 5-20% APY
→ Yield Farming: Provide liquidity, earn fees
→ Lending: Loan crypto, earn interest
→ Liquidity Mining: Earn tokens for trading pairs

⚠️ WARNING: DeFi has risks - start small and learn!

═══════════════════════════════════════

7. CONTENT CREATION 📱

Build an audience and get paid!

PLATFORMS:
→ Mirror.xyz: Publish articles, earn crypto tips
→ Lens Protocol: Decentralized social media
→ Rally: Create your own social token
→ Twitter/X: Monetize with crypto tips

═══════════════════════════════════════

8. WEB3 FREELANCING 🖥️

Offer services, get paid in crypto

SERVICES IN DEMAND:
→ Smart Contract Development
→ NFT Art & Design
→ Community Management
→ Content Writing
→ Discord Setup & Management
→ Tokenomics Consulting

═══════════════════════════════════════

YOUR ACTION PLAN:

BEGINNER (Month 1-2):
✓ Complete educational quests (like this one!)
✓ Join communities and learn
✓ Start airdrop hunting (low risk)
✓ Apply for entry-level Web3 jobs

INTERMEDIATE (Month 3-6):
✓ Complete bounties
✓ Build portfolio projects
✓ Explore DeFi carefully
✓ Network with Web3 professionals

ADVANCED (Month 6+):
✓ Launch your own project
✓ Become a protocol contributor
✓ Advanced trading/investing
✓ Mentor others and build influence

═══════════════════════════════════════

REMEMBER: Start with jobs, airdrops, and bounties - they're the safest ways to earn while you learn!`,
          order: 2,
          taskType: "quiz",
          xpReward: 150,
          isDaily: false,
          inputLabel: "QUIZ: Which is the SAFEST way for beginners to start earning in Web3? (Type: jobs, trading, or defi)",
          inputName: "web3_earning",
          requirements: { action: "jobs" }
        },
        {
          title: "🐦 Why X (Twitter) is Web3's Home & How to Build There",
          description: `WHY X/TWITTER IS THE CENTER OF WEB3

If you're serious about Web3, you MUST be active on X (formerly Twitter). Here's why:

═══════════════════════════════════════

WHY X MATTERS IN WEB3:

1. IT'S WHERE EVERYTHING HAPPENS FIRST
→ Project announcements
→ Airdrop alerts
→ Breaking news
→ Alpha (insider info)
→ Job postings

2. NETWORKING POWERHOUSE
→ Connect with founders
→ DM directly with industry leaders
→ Join Twitter Spaces (live audio conversations)
→ Build your reputation publicly

3. OPPORTUNITY DISCOVERY
→ Airdrops announced first on Twitter
→ NFT whitelist spots
→ Beta testing opportunities
→ Collaboration requests
→ Speaking/podcast invitations

4. CREDIBILITY BUILDER
→ Your profile is your Web3 resume
→ Showcase your knowledge
→ Build thought leadership
→ Attract job opportunities

5. REAL-TIME LEARNING
→ Follow industry experts
→ See what's trending
→ Learn from others' mistakes
→ Stay ahead of the curve

═══════════════════════════════════════

HOW TO BUILD YOUR WEB3 PRESENCE ON X:

STEP 1: OPTIMIZE YOUR PROFILE

Profile Picture:
→ Professional or unique avatar
→ Consider NFT PFP (shows you're in Web3)
→ Make it recognizable

Username:
→ Easy to remember
→ Professional (avoid numbers/underscores if possible)
→ Consider Web3-related name

Bio Format:
→ Who you are (role/interest)
→ What you're building/learning
→ Your Web3 focus areas
→ Add "Citizen @Onboard3___"
→ Include emoji for personality
→ Add location if comfortable

Example Bio:
"Web3 Developer | Building on Ethereum | DeFi & NFT enthusiast | Citizen @Onboard3___ | Learning in public 🚀"

Header Image:
→ Use Web3-themed banner
→ Or showcase your projects
→ Keep it professional

═══════════════════════════════════════

STEP 2: CONTENT STRATEGY

WHAT TO POST:

1. LEARNING IN PUBLIC (Most Important!)
→ Share what you're learning daily
→ Post your progress and challenges
→ Ask questions when stuck
→ Document your Web3 journey

Example: "Day 15 of learning Solidity. Finally understood how mappings work! Here's what clicked for me... 🧵"

2. VALUE-DRIVEN CONTENT
→ Share useful resources
→ Explain concepts simply
→ Create tutorial threads
→ Review tools and platforms

3. ENGAGE WITH COMMUNITY
→ Reply to others' posts thoughtfully
→ Retweet valuable content
→ Join relevant conversations
→ Participate in Twitter Spaces

4. SHOWCASE YOUR WORK
→ Share projects you build
→ Post about quests you complete
→ Highlight achievements
→ Share GitHub repos

═══════════════════════════════════════

POSTING FREQUENCY:
→ Minimum: 1-2 posts per day
→ Ideal: 3-5 posts per day
→ Engage: 10-20 replies per day

BEST TIMES TO POST:
→ 8-10 AM EST (US waking up)
→ 12-2 PM EST (lunch break)
→ 7-9 PM EST (evening browsing)

═══════════════════════════════════════

STEP 3: WHO TO FOLLOW

MUST-FOLLOW ACCOUNTS:

Founders & Leaders:
→ @VitalikButerin (Ethereum creator)
→ @cz_binance (Binance CEO)
→ @elonmusk (Twitter/X owner, crypto influencer)
→ @haydenzadams (Uniswap founder)

Educators:
→ @AndreCronjeTech (DeFi expert)
→ @sassal0x (DeFi analyst)
→ @Onboard3___ (That's us! Learn & earn)

News & Analysis:
→ @Cointelegraph
→ @TheBlock__
→ @Bankless

Communities:
→ @Onboard3___ (Join our movement!)

═══════════════════════════════════════

STEP 4: ENGAGEMENT TACTICS

GROW YOUR FOLLOWING:

1. REPLY-GUY STRATEGY
→ Reply thoughtfully to larger accounts
→ Add value, don't spam
→ People will check your profile

2. THREAD GAME
→ Create educational threads
→ Break down complex topics
→ Use clear formatting
→ End with a CTA (call-to-action)

3. CONSISTENCY
→ Post daily without fail
→ Show up regularly
→ Build trust over time

4. AUTHENTICITY
→ Be yourself
→ Share real experiences
→ Admit when you don't know something
→ Show your personality

═══════════════════════════════════════

STEP 5: MONETIZATION OPPORTUNITIES

ONCE YOU BUILD FOLLOWING:

→ Project collaborations
→ Sponsored posts ($100-$10,000+)
→ Consulting opportunities
→ Speaking engagements
→ Beta tester invites
→ Whitelist spots
→ Direct job offers

═══════════════════════════════════════

COMMON MISTAKES TO AVOID:

❌ Buying followers (kills engagement)
❌ Posting generic content
❌ Only promoting yourself
❌ Ignoring replies
❌ Following too many accounts (max 2:1 ratio)
❌ Being overly promotional
❌ Posting negative content constantly
❌ Not engaging with others

✅ DO INSTEAD:
→ Grow organically
→ Add unique value
→ Engage genuinely
→ Build relationships
→ Keep following count reasonable
→ Balance self-promotion with value
→ Stay positive and helpful
→ Support others' wins

═══════════════════════════════════════

YOUR 30-DAY X CHALLENGE:

Week 1: Foundation
→ Optimize profile completely
→ Follow 50 relevant accounts
→ Post intro thread
→ Engage 10 times daily

Week 2: Content Creation
→ Post daily learning updates
→ Create 1 educational thread
→ Join 2 Twitter Spaces
→ Reply to 15 posts daily

Week 3: Community Building
→ Post 2x daily
→ Create 2 threads
→ Host/co-host a Space
→ Collaborate with 1 person

Week 4: Momentum
→ Post consistently
→ Analyze what works
→ Double down on best content
→ Start seeing growth!

═══════════════════════════════════════

REMEMBER: X is not just social media in Web3 - it's your professional network, job board, news source, and community hub all in one!

The opportunities that will change your life will likely come through a DM or mention on X. Show up, add value, and watch doors open.`,
          order: 3,
          taskType: "quiz",
          xpReward: 150,
          isDaily: false,
          inputLabel: "QUIZ: What should you do daily on X to build your Web3 presence? (Type: post, buy, or wait)",
          inputName: "twitter_importance",
          requirements: { action: "post" }
        },
        {
          title: "✅ Set Up Your X Profile - Join the Community",
          description: `TIME TO BUILD YOUR WEB3 PRESENCE ON X!

Now that you understand WHY X matters, let's set up your profile properly.

═══════════════════════════════════════

YOUR PROFILE CHECKLIST:

1. CREATE/UPDATE YOUR X ACCOUNT
→ If you don't have an account, create one at x.com
→ Choose a professional username
→ Verify your email

2. OPTIMIZE YOUR BIO
→ Add your Web3 interests (blockchain, DeFi, NFTs, etc.)
→ IMPORTANT: Add "Citizen @Onboard3___" to your bio
→ Add relevant emoji
→ Keep it under 160 characters

Example Bios:

"Aspiring Web3 Developer | Learning Solidity & Smart Contracts | Citizen @Onboard3___ | Building in public 🚀"

"NFT Enthusiast | Exploring DeFi | Citizen @Onboard3___ | Connect with me! 🌐"

"Blockchain curious | Starting my Web3 journey | Citizen @Onboard3___ | Let's learn together 💡"

3. ADD A PROFILE PICTURE
→ Upload a clear photo or avatar
→ Make it professional and recognizable

4. SET A HEADER IMAGE
→ Optional but recommended
→ Web3-themed or personal brand

5. FOLLOW KEY ACCOUNTS
→ @Onboard3___ (Us! Your Web3 learning hub)
→ @VitalikButerin
→ @cz_binance
→ Other accounts from the previous lesson

6. POST YOUR FIRST TWEET
→ Introduce yourself
→ Mention you're starting Web3 journey
→ Tag @Onboard3___
→ Use #Web3Journey

Example First Tweet:
"Just started my Web3 journey with @Onboard3___! Excited to learn about blockchain, DeFi, and build my future in this space. Who else is learning Web3? Let's connect! 🚀 #Web3Journey"

═══════════════════════════════════════

WHY "CITIZEN @Onboard3___" IN YOUR BIO?

✅ Shows you're part of our community
✅ Helps other learners find you
✅ Unlocks exclusive opportunities
✅ Gets you featured in our community highlights
✅ Access to Onboard3 citizen perks (coming soon!)

═══════════════════════════════════════

AFTER SETUP:

Once your profile is ready and you've added "Citizen @Onboard3___" to your bio, submit your X username below (include the @ symbol).

We'll verify your profile and you'll officially be part of the Onboard3 citizen community!`,
          order: 4,
          taskType: "quiz",
          xpReward: 200,
          isDaily: false,
          buttonText: "🐦 Go to X/Twitter",
          buttonLink: "https://twitter.com",
          inputLabel: "Enter your X username with @ (example: @yourname) - Make sure 'Citizen @Onboard3___' is in your bio!",
          inputName: "twitter_username",
          requirements: { action: "@" }
        },
        {
          title: "💬 Join Our Telegram Community",
          description: `WELCOME TO OUR GROWING WEB3 FAMILY!

Onboard3 has a vibrant Telegram community with over 1,000 Web3 learners, builders, and enthusiasts just like you!

═══════════════════════════════════════

WHAT YOU'LL FIND IN OUR TELEGRAM:

🤝 NETWORKING
→ Connect with fellow Web3 learners
→ Meet developers, designers, and founders
→ Find collaboration partners
→ Build lasting friendships

💡 INSTANT SUPPORT
→ Ask questions, get quick answers
→ Share resources and tips
→ Learn from others' experiences
→ Get unstuck when building

🎁 EXCLUSIVE OPPORTUNITIES
→ Early access to new quests
→ Bounty announcements
→ Job postings (coming soon!)
→ Airdrop alerts
→ Beta testing invites

📢 STAY UPDATED
→ Platform announcements
→ Event invitations
→ Workshop schedules
→ Community initiatives

🏆 COLLABORATE & BUILD
→ Find teammates for hackathons
→ Join study groups
→ Work on projects together
→ Share your wins and progress

═══════════════════════════════════════

HOW TO MAKE A GREAT FIRST IMPRESSION:

When you join, introduce yourself! Here's the format we use:

"Gm everyone! 👋

I'm [Your Name], just joined Onboard3 and excited to start my Web3 journey!

Interested in: [DeFi/NFTs/Development/etc.]
Background: [Student/Developer/Designer/etc.]
Currently learning: [What you're focusing on]

Follow me on X: https://x.com/[yourusername]

Looking forward to learning and building with you all! 🚀"

═══════════════════════════════════════

COMMUNITY GUIDELINES:

✅ Be respectful and supportive
✅ Ask questions - no question is too basic!
✅ Share valuable resources
✅ Help others when you can
✅ Celebrate community wins
✅ Stay positive and encouraging

❌ No spam or self-promotion without value
❌ No scams or suspicious links
❌ No financial advice
❌ No harassment or negativity

═══════════════════════════════════════

CLICK THE BUTTON BELOW TO JOIN!

Note: You'll need to copy the introduction format above, fill in your details, and post it in the Telegram group after joining.

After joining and introducing yourself, come back and type 'joined' to complete this task.

TIP: Save your X username handy - you'll need it for your introduction!`,
          order: 5,
          taskType: "quiz",
          xpReward: 150,
          isDaily: false,
          buttonText: "💬 Join Telegram & Introduce Yourself",
          buttonLink: "https://t.me/onboard_3/3124",
          inputLabel: "After joining Telegram and introducing yourself, type 'joined'",
          inputName: "telegram_community",
          requirements: { action: "joined" }
        },
        {
          title: "🌟 Welcome to Onboard3 - Your Web3 Future Starts Here",
          description: `CONGRATULATIONS! YOU'RE NOW AN ONBOARD3 CITIZEN! 🎉

You've completed the fundamentals and you're officially part of our growing Web3 community.

═══════════════════════════════════════

WHAT IS ONBOARD3?

Onboard3 is your complete Web3 platform where you LEARN, EARN, and GROW in the decentralized future.

Our mission: Make Web3 accessible for everyone - from complete beginners to experienced builders.

═══════════════════════════════════════

✅ AVAILABLE NOW:

🎯 QUESTS & REWARDS
Complete educational tasks and challenges, earn XP and USDC rewards. Get paid to learn Web3!

Current Features:
→ Beginner to Advanced quests
→ Daily challenges
→ Skill-based missions
→ Instant XP rewards
→ USDC payouts for top performers

📚 EDUCATIONAL RESOURCES
Master blockchain technology with structured learning paths:
→ Blockchain Fundamentals
→ Smart Contract Development (Solidity)
→ DeFi Protocols & Mechanics
→ NFT Creation & Trading
→ Web3 Development (React + Web3.js)
→ Security Best Practices

🎪 COMMUNITY EVENTS
Network with builders and grow together:
→ Weekly workshops and webinars
→ Hackathons with prizes
→ Online meetups
→ Study groups
→ Project showcases
→ Guest speaker sessions

🎁 REFERRAL PROGRAM
Grow together and earn together:
→ +50 XP when someone joins with your link
→ +100 XP when they complete their first quest
→ +50 XP for every quest they complete
→ Build your Web3 network
→ Help others get started

═══════════════════════════════════════

🚀 COMING SOON:

💼 WEB3 JOB BOARD
Your gateway to Web3 career opportunities:
→ Curated job listings from top Web3 companies
→ Remote positions worldwide
→ Entry-level to senior roles
→ Technical & non-technical jobs
→ Internship opportunities
→ Freelance gigs
→ Direct application to employers

Job Categories:
→ Blockchain Development
→ Smart Contract Engineering
→ Full-Stack Web3 Development
→ Community Management
→ Content Creation & Marketing
→ Product Management
→ UI/UX Design
→ DevOps & Security

🎯 BOUNTY PROGRAMS
Get paid for your skills and contributions:
→ Development bounties ($500-$50,000)
→ Content creation bounties ($50-$5,000)
→ Bug hunting bounties ($100-$100,000)
→ Translation bounties ($100-$2,000)
→ Design bounties ($200-$10,000)
→ Community bounties ($50-$1,000)

How Bounties Work:
1. Browse available bounties
2. Claim the one that fits your skills
3. Submit your work
4. Get reviewed by our team
5. Receive payment in USDC/crypto

🛍️ ONBOARD3 STORE
Exclusive Web3 merchandise and digital assets:
→ Limited edition NFTs
→ Onboard3 branded merchandise
→ Educational course bundles
→ Premium resource packs
→ Achievement badges
→ Special access passes

Store Benefits:
→ Use your earned XP as currency
→ Exclusive citizen discounts
→ Early access to limited drops

═══════════════════════════════════════

YOUR WEB3 JOURNEY ROADMAP:

MONTH 1-2 (Foundation):
✓ Complete beginner quests
✓ Learn Web3 fundamentals
✓ Join community events
✓ Build your X presence
✓ Network in Telegram

MONTH 3-4 (Growth):
✓ Tackle intermediate quests
✓ Start a course
✓ Complete your first bounty
✓ Apply for entry-level Web3 jobs
✓ Share your learning journey

MONTH 5-6 (Momentum):
✓ Advanced quests
✓ Launch a small project
✓ Earn consistent bounty income
✓ Mentor new community members
✓ Build your portfolio

MONTH 6+ (Thriving):
✓ Secure Web3 employment
✓ Contribute to open source
✓ Lead community initiatives
✓ Create educational content
✓ Give back to the community

═══════════════════════════════════════

WHY ONBOARD3 IS DIFFERENT:

🎯 LEARN BY DOING
No boring lectures - hands-on quests that teach real skills

💰 GET PAID TO LEARN
Earn while you study with XP and USDC rewards

🤝 REAL COMMUNITY
Not just a platform - a family of Web3 builders

🚀 COMPLETE ECOSYSTEM
Everything you need in one place: learn, earn, connect, grow

🌍 ACCESSIBLE TO ALL
No prerequisites - start from zero, we'll guide you

═══════════════════════════════════════

YOUR NEXT STEPS:

1. EXPLORE MORE QUESTS
→ Browse the quest dashboard
→ Find topics that interest you
→ Start earning more XP

2. JOIN A COURSE
→ Deep dive into specific topics
→ Follow structured learning paths
→ Build real projects

3. ATTEND EVENTS
→ Check the events calendar
→ Register for workshops
→ Network with others

4. GET YOUR REFERRAL LINK
→ Share Onboard3 with friends
→ Earn bonus XP together
→ Build your network

5. STAY ACTIVE
→ Complete daily challenges
→ Engage in Telegram
→ Post on X about your journey
→ Help new citizens

═══════════════════════════════════════

EXCLUSIVE CITIZEN BENEFITS:

As an Onboard3 Citizen, you get:

🎖️ Verified Citizen Badge on your profile
🎁 Access to citizen-only quests
💬 Priority support in community
🎯 Early access to new features
🏆 Featured on leaderboards
📩 Weekly opportunity newsletter
🎪 Exclusive event invitations

═══════════════════════════════════════

THE ONBOARD3 PROMISE:

We're committed to:
✓ Providing quality education
✓ Creating real earning opportunities
✓ Building an inclusive community
✓ Supporting your Web3 journey
✓ Growing together with transparency

═══════════════════════════════════════

REMEMBER:

The best time to start Web3 was yesterday.
The second best time is NOW.

You've taken the first step by becoming an Onboard3 citizen. The opportunities ahead are limitless - from learning cutting-edge technology to earning income, from building your network to launching your career.

Web3 is the future, and the future is NOW.

Welcome to Onboard3.
Welcome to your Web3 future.
Welcome home, Citizen. 🚀

═══════════════════════════════════════

STAY CONNECTED:

🌐 Website: onboard3.com
🐦 X/Twitter: @Onboard3___
💬 Telegram: t.me/onboard_3
📧 Email: hello@onboard3.com

═══════════════════════════════════════`,
          order: 6,
          taskType: "quiz",
          xpReward: 200,
          isDaily: false,
          inputLabel: "QUIZ: What excites you most about Onboard3? (Type one: quest, jobs, bounty, course, event, community, store, or token)",
          inputName: "onboard3_welcome",
          requirements: { action: "quest" }
        }
      ],
      resources: [
        {
          title: "Onboard3 Telegram Community",
          url: "https://t.me/onboard_3",
          type: "community"
        },
        {
          title: "Ethereum Web3 Guide",
          url: "https://ethereum.org/en/web3/",
          type: "article"
        },
        {
          title: "X (Twitter)",
          url: "https://x.com/onboard3__",
          type: "platform"
        },
        {
          title: "Web3 Career Guide",
          url: "https://web3.career/learn/web3-career-guide",
          type: "article"
        }
      ],
      totalAttempts: 0,
      totalCompletions: 0,
      totalParticipants: 0,
      averageCompletionTime: 0,
      maxParticipants: null
    });

    await beginnerQuest.save();
    
    console.log('\n🎉 SUCCESS! Educational Web3 Onboarding Quest Created!');
    console.log('\n📋 Quest Details:');
    console.log(`   ID: ${beginnerQuest._id}`);
    console.log(`   Title: ${beginnerQuest.title}`);
    console.log(`   Total Tasks: ${beginnerQuest.tasks.length}`);
    console.log(`   Total XP: ${beginnerQuest.tasks.reduce((sum, task) => sum + task.xpReward, 0) + beginnerQuest.baseXpReward} XP`);
    console.log('\n✅ Educational Quest Flow:');
    console.log('   1. Understanding Web3 Fundamentals (150 XP)');
    console.log('   2. How to Make Money in Web3 (150 XP)');
    console.log('   3. Why X/Twitter is Web3\'s Home (150 XP)');
    console.log('   4. Set Up X Profile - Become Citizen (200 XP)');
    console.log('   5. Join Telegram Community (150 XP)');
    console.log('   6. Welcome to Onboard3 (200 XP)');
    console.log('   + Completion Bonus (500 XP)');
    console.log('\n🎓 Total: 1,500 XP for complete educational onboarding!');
    console.log('🎯 Features: Deep Web3 education + X profile verification + Community intro\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createBeginnerQuest();