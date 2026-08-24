const fs = require('fs');
let lines = fs.readFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', 'utf8').split('\n');

// ── 1. Remove quiz nav items from sidebar (lines 358 and 395, 0-indexed 357 and 394)
lines = lines.filter((l, i) => {
    if (l.includes('data-tab="quiz"') && l.includes('menu-item')) return false;
    return true;
});

// ── 2. Remove quiz content-section (lines 604-678 originally, now shifted)
const quizSectionStart = lines.findIndex(l => l.includes('Friday Quiz Night Section'));
let quizSectionEnd = -1;
for (let i = quizSectionStart + 1; i < lines.length; i++) {
    if (lines[i].includes('class="content-section"') && !lines[i].includes('id="quiz"')) {
        quizSectionEnd = i;
        break;
    }
}
if (quizSectionStart !== -1 && quizSectionEnd !== -1) {
    lines.splice(quizSectionStart, quizSectionEnd - quizSectionStart);
    console.log('Removed quiz content section:', quizSectionStart + 1, '-', quizSectionEnd);
}

// ── 3. Remove quiz modal (from "Create Quiz Session Modal" to closing </div></div>)
const modalStart = lines.findIndex(l => l.includes('Create Quiz Session Modal'));
// Find the end — 2 closing divs after form closing
let modalEnd = -1;
for (let i = modalStart + 1; i < Math.min(modalStart + 250, lines.length); i++) {
    if (lines[i].includes('Applications Section') || lines[i].includes('id="applications"')) {
        modalEnd = i;
        break;
    }
}
if (modalStart !== -1 && modalEnd !== -1) {
    lines.splice(modalStart, modalEnd - modalStart);
    console.log('Removed quiz modal: lines', modalStart + 1, '-', modalEnd);
}

// ── 4. Remove quiz JS functions
const result = lines.join('\n')
    // Remove any quiz-related JS function blocks
    .replace(/\/\/ ={3,}.*quiz.*\n([\s\S]*?)(?=\/\/ ={3,}|<\/script>)/gi, '')
    .replace(/function (openCreateQuizModal|closeCreateQuizModal|createQuizSession|loadQuizzes|startQuiz|endQuiz|deleteQuiz|generateQuizQuestions)[^}]*\{[^}]*(\{[^}]*\}[^}]*)*\}/g, '')
    .replace(/\/\/ .*quiz.*\n/gi, '')
    .replace(/\/\/.*Quiz.*\n/g, '');

lines = result.split('\n');

// ── 5. Fix admin layout: ensure content-sections have proper structure
// Add proper header icons to each section if missing
const sectionFixes = [
    { id: 'overview',     icon: 'fa-chart-line',     title: 'Overview',            sub: 'Platform statistics and management' },
    { id: 'quests',       icon: 'fa-trophy',          title: 'Quest Management',    sub: 'Create and manage quests' },
    { id: 'events',       icon: 'fa-calendar-alt',    title: 'Event Management',    sub: 'Create and manage events' },
    { id: 'applications', icon: 'fa-graduation-cap',  title: 'Applications',        sub: 'Review and manage course applications' },
    { id: 'banned-users', icon: 'fa-user-slash',      title: 'Banned Users',        sub: 'Users banned for violations' },
    { id: 'ambassadors',  icon: 'fa-building-columns', title: 'Campus Ambassadors', sub: 'Manage campus ambassador program' },
    { id: 'projects',     icon: 'fa-rocket',          title: 'Project Submissions', sub: 'Review submitted projects' },
    { id: 'users',        icon: 'fa-users',           title: 'User Management',     sub: 'View and manage all users' },
    { id: 'withdrawals',  icon: 'fa-wallet',          title: 'Withdrawals',         sub: 'Manage withdrawal requests' },
];

let content = lines.join('\n');

// Fix header h2 colors — old code used color: #39FF14 inline
content = content.replace(/color:\s*#39FF14/g, 'color:var(--green)');
content = content.replace(/color:\s*var\(--primary\)/g, 'color:var(--green)');
content = content.replace(/#39FF14/g, 'var(--green)');
content = content.replace(/rgba\(57,\s*255,\s*20,/g, 'rgba(94,194,19,');
content = content.replace(/rgba\(57, 255, 20,/g, 'rgba(94,194,19,');

// Fix backgrounds
content = content.replace(/background:\s*rgba\(15,\s*15,\s*15,\s*0\.9[58]\)/g, 'background:var(--bg-card)');
content = content.replace(/background:\s*#050810/g, 'background:var(--bg)');
content = content.replace(/background:\s*#0A0E27/g, 'background:var(--bg)');
content = content.replace(/#8B92B8/g, 'var(--text-2)');

// Fix old border colors
content = content.replace(/border:\s*2px solid rgba\(57,\s*255,\s*20,/g, 'border:1px solid rgba(94,194,19,');
content = content.replace(/border:\s*1px solid rgba\(57,\s*255,\s*20,/g, 'border:1px solid rgba(94,194,19,');

// Ensure no overflow:hidden on body
content = content.replace(/body\s*\{[^}]*overflow:\s*hidden[^}]*\}/g, (m) => m.replace('overflow: hidden', 'overflow-x:hidden'));

fs.writeFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', content, 'utf8');
console.log('Done. Final lines:', content.split('\n').length);
