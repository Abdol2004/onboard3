const fs = require('fs');
let c = fs.readFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', 'utf8');
const origLen = c.split('\n').length;

// Remove quiz JS function calls and references
// Simple approach: find and remove lines that only reference quiz functions
const lines = c.split('\n');
const quizFns = ['loadQuizzes', 'openCreateQuizModal', 'createQuizSession', 'loadActiveQuiz',
                  'startQuiz', 'endQuiz', 'deleteQuizSession', 'generateQuizQuestions',
                  'createQuizModal', 'quizSocket', 'quizScheduler'];

// Remove lines that call quiz-only functions (not mixed with other code)
const cleaned = lines.filter(line => {
    const t = line.trim();
    // Remove quiz function call lines
    if (quizFns.some(fn => t.startsWith(fn + '(') || t === fn + '();')) return false;
    // Remove quiz-only onclick handlers
    if (t.includes('onclick="loadQuizzes') || t.includes('onclick="openCreateQuiz') ||
        t.includes('onclick="startQuiz') || t.includes('onclick="endQuiz') ||
        t.includes('onclick="deleteQuiz')) return false;
    return true;
});

c = cleaned.join('\n');

// Now find and remove quiz JS function definitions (multi-line blocks)
// Strategy: find async/function declarations for quiz functions and remove their blocks
quizFns.forEach(fn => {
    // Match function declaration pattern
    const patterns = [
        new RegExp('\\s*(?:async\\s+)?function\\s+' + fn + '\\s*\\([^)]*\\)\\s*\\{', 'g'),
    ];
    // Simple removal: find the function start and remove to matching closing brace
    let idx = c.search(new RegExp('(?:async\\s+)?function\\s+' + fn + '\\s*\\('));
    while (idx !== -1) {
        // Find opening brace
        let braceStart = c.indexOf('{', idx);
        if (braceStart === -1) break;
        // Count braces to find closing
        let depth = 0, i = braceStart, end = -1;
        while (i < c.length) {
            if (c[i] === '{') depth++;
            else if (c[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
            i++;
        }
        if (end !== -1) {
            // Find start of line for the function
            let lineStart = c.lastIndexOf('\n', idx);
            c = c.slice(0, lineStart + 1) + c.slice(end + 1);
            console.log('Removed function:', fn);
        }
        idx = c.search(new RegExp('(?:async\\s+)?function\\s+' + fn + '\\s*\\('));
    }
});

fs.writeFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length, '(was', origLen + ')');
