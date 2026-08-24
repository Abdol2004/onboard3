const fs = require('fs');
let lines = fs.readFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', 'utf8').split('\n');

// Find all function declarations that are quiz-related and remove their blocks
const quizFunctionPatterns = [
    /^\s*(?:async\s+)?function\s+(loadQuizzes|loadActiveQuiz|loadQuizStats|openCreateQuizModal|closeCreateQuizModal|createQuizSession|startQuiz|endQuiz|deleteQuizSession|generateQuizQuestions|removeQuizQuestion|addQuizQuestion|quizQuestion|manageQuiz)\s*\(/,
    /^\s*(?:async\s+)?function\s+\w*[Qq]uiz\w*\s*\(/,
    /^\s*let\s+quizQuestionCounter/,
];

// Find all quiz function blocks to remove
const blocksToRemove = [];

for (let i = 0; i < lines.length; i++) {
    const isQuizFn = quizFunctionPatterns.some(p => p.test(lines[i]));
    if (isQuizFn) {
        // Find opening brace
        let braceStart = -1;
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].includes('{')) { braceStart = j; break; }
        }
        if (braceStart === -1) continue;

        // Count braces to find end of function
        let depth = 0, end = -1;
        for (let j = braceStart; j < lines.length; j++) {
            for (const ch of lines[j]) {
                if (ch === '{') depth++;
                else if (ch === '}') depth--;
            }
            if (depth === 0) { end = j; break; }
        }
        if (end !== -1) {
            blocksToRemove.push({ start: i, end: end });
            console.log('Removing quiz fn at lines', i + 1, '-', end + 1, ':', lines[i].trim().substring(0, 50));
        }
    }
}

// Remove blocks in reverse order (to preserve indices)
blocksToRemove.reverse().forEach(({ start, end }) => {
    lines.splice(start, end - start + 1);
});

// Also remove single-line quiz references
lines = lines.filter(l => {
    if (l.includes('quizzesTableBody') || l.includes('activeQuizStatus') ||
        l.includes('scheduledQuizzes') || l.includes('completedQuizzes') ||
        l.includes("Loading quizzes")) return false;
    return true;
});

fs.writeFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', lines.join('\n'), 'utf8');
console.log('Done. Lines:', lines.length);
