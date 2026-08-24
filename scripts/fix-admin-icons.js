const fs = require('fs');
let c = fs.readFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', 'utf8');

const headers = [
    ['Admin Overview',               'fa-chart-line'],
    ['Quest Management',             'fa-trophy'],
    ['Event Management',             'fa-calendar-alt'],
    ['Course Applications',          'fa-graduation-cap'],
    ['Banned Users',                 'fa-user-slash'],
    ['Campus Ambassador Management', 'fa-building-columns'],
    ['Project Submissions',          'fa-rocket'],
    ['User Management',              'fa-users'],
    ['Withdrawal Management',        'fa-wallet'],
];

headers.forEach(([title, icon]) => {
    const plain = '<h2>' + title + '</h2>';
    const withIcon = '<h2><i class="fas ' + icon + '" style="color:var(--green);margin-right:.5rem"></i>' + title + '</h2>';
    if (c.includes(plain)) {
        c = c.split(plain).join(withIcon);
        console.log('Fixed header:', title);
    }
});

// Also remove any remaining quiz-related JS function bodies
// Remove quiz JS block markers
const quizFns = ['openCreateQuizModal', 'createQuizSession', 'loadQuizzes', 'loadActiveQuiz',
                  'startQuiz', 'endQuiz', 'deleteQuizSession', 'generateQuizQuestions'];

quizFns.forEach(fn => {
    if (c.includes(fn + '(')) {
        console.log('Quiz fn still referenced:', fn);
    }
});

fs.writeFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);
