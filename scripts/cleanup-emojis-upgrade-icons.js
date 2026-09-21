/**
 * 1. Remove Twemoji script/style blocks we injected
 * 2. Strip all Unicode emoji characters from .ejs files
 * 3. Upgrade Font Awesome CDN from any 6.x.x to 6.7.2
 */

const fs   = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, '../views');
const FA_NEW    = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
const FA_RE     = /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[\d.]+\/css\/all\.min\.css/g;

// Comprehensive emoji Unicode ranges
const EMOJI_RE = new RegExp(
  '[\u{1F000}-\u{1FFFF}' +  // Misc symbols, pictographs, transport, faces, food, etc.
  '\u{2600}-\u{27BF}' +      // Misc symbols, dingbats (✅❌✓⚡☀ etc.)
  '\u{2B00}-\u{2BFF}' +      // Misc symbols & arrows
  '\u{FE00}-\u{FE0F}' +      // Variation selectors
  '\u{1F1E0}-\u{1F1FF}' +    // Regional indicator symbols (flags)
  '\u{200D}' +               // Zero-width joiner
  '\u{20E3}' +               // Combining enclosing keycap
  '\u{3030}\u{303D}' +       // Wavy dash, part alternation mark
  '\u{3297}\u{3299}' +       // Circled CJK
  ']',
  'gu'
);

// The twemoji blocks we injected — three variants
const TWEMOJI_PATTERNS = [
  // Sidebar / admin nav (multiline block after existing </script>)
  /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/twemoji@[\d.]+\/dist\/twemoji\.min\.js"[^>]*><\/script>\s*<script>[\s\S]*?<\/script>\s*<style>\s*img\.emoji\{[^}]*\}\s*<\/style>/g,
  // pitch/partner/coming-soon (inline one-liner variant)
  /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/twemoji@[\d.]+\/dist\/twemoji\.min\.js"[^>]*><\/script>\s*\n<script>\(function\(\)\{[^<]*\}\)\(\);<\/script>\s*\n<style>img\.emoji\{[^}]*\}<\/style>\s*\n/g,
];

let totalFiles = 0;
let changedFiles = 0;

function processFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  let out = src;

  // 1. Remove Twemoji blocks (try both patterns)
  for (const pat of TWEMOJI_PATTERNS) {
    out = out.replace(pat, '');
  }

  // 2. Upgrade Font Awesome
  out = out.replace(FA_RE, FA_NEW);

  // 3. Strip emoji characters
  out = out.replace(EMOJI_RE, '');

  // 4. Clean up double spaces left by emoji removal (in text nodes only — simple heuristic)
  out = out.replace(/  +/g, ' ');

  if (out !== src) {
    fs.writeFileSync(filePath, out, 'utf8');
    changedFiles++;
    console.log('Updated:', path.relative(path.join(__dirname, '..'), filePath));
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.ejs')) {
      totalFiles++;
      processFile(full);
    }
  }
}

walkDir(VIEWS_DIR);
console.log(`\nDone. ${changedFiles} of ${totalFiles} files updated.`);
