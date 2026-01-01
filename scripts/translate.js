import fs from 'fs';
import path from 'path';

// ==========================================================
// CONFIGURATION
// ==========================================================
const API_KEY = process.env.GOOGLE_API_KEY; // Run with: GOOGLE_API_KEY=xxx node scripts/translate.js
const INPUT_FILE = './src/data/questions.json';
const TARGET_LANGS = ['en', 'es'];
const BATCH_SIZE = 50; // Google Translate API supports multiple 'q' parameters

if (!API_KEY) {
  console.error('Error: GOOGLE_API_KEY environment variable is not set.');
  process.exit(1);
}

async function translateBatch(texts, targetLang) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        source: 'fr',
        target: targetLang,
        format: 'text'
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.data.translations.map(t => t.translatedText);
  } catch (error) {
    console.error(`Translation error (${targetLang}):`, error.message);
    return null;
  }
}

async function run() {
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${data.length} questions.`);

  for (const lang of TARGET_LANGS) {
    console.log(`\nTranslating to ${lang.toUpperCase()}...`);
    
    // Collect all strings that need translation
    const toTranslate = [];
    const mapping = []; // Keep track of where each string belongs

    data.forEach((q, qIdx) => {
      // Check question
      if (!q[`question_${lang}`]) {
        mapping.push({ type: 'question', qIdx });
        toTranslate.push(q.question_fr);
      }

      // Check options
      q.options.forEach((opt, optIdx) => {
        if (!opt[`text_${lang}`]) {
          mapping.push({ type: 'option', qIdx, optIdx });
          toTranslate.push(opt.text_fr);
        }
      });
    });

    if (toTranslate.length === 0) {
      console.log(`All questions already have ${lang} translations.`);
      continue;
    }

    console.log(`Found ${toTranslate.length} strings to translate.`);

    // Translate in batches
    for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
      const batchTexts = toTranslate.slice(i, i + BATCH_SIZE);
      const batchMapping = mapping.slice(i, i + BATCH_SIZE);
      
      console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)}...`);
      
      const results = await translateBatch(batchTexts, lang);
      
      if (results) {
        results.forEach((translatedText, resIdx) => {
          const map = batchMapping[resIdx];
          if (map.type === 'question') {
            data[map.qIdx][`question_${lang}`] = translatedText;
          } else {
            data[map.qIdx].options[map.optIdx][`text_${lang}`] = translatedText;
          }
        });

        // Save progress after each batch to avoid data loss
        fs.writeFileSync(INPUT_FILE, JSON.stringify(data, null, 2));
      } else {
        console.error('Stopping due to translation error.');
        break;
      }

      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log('\nTranslation completed successfully.');
}

run();

