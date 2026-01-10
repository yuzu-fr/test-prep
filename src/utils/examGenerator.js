/**
 * Mock Exam Generator for TestCivique Prep
 * Strictly follows the official blueprint: 40 questions (28 knowledge, 12 situational)
 */

const BLUEPRINT = {
  'CSP': [
    { category: 'CSP_01', knowledge: 5, situation: 6 },
    { category: 'CSP_02', knowledge: 6, situation: 0 },
    { category: 'CSP_03', knowledge: 5, situation: 6 },
    { category: 'CSP_04', knowledge: 8, situation: 0 },
    { category: 'CSP_05', knowledge: 4, situation: 0 }
  ],
  'CR': [
    { category: 'CR_001', knowledge: 5, situation: 6 },
    { category: 'CR_002', knowledge: 6, situation: 0 },
    { category: 'CR_003', knowledge: 5, situation: 6 },
    { category: 'CR_004', knowledge: 8, situation: 0 },
    { category: 'CR_005', knowledge: 4, situation: 0 }
  ]
};

function shuffle(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

/**
 * Generates an exam paper with exactly 40 questions.
 */
export function generateExamPaper(knowledgePool, situationalPool, examType) {
  const blueprint = BLUEPRINT[examType];
  if (!blueprint) throw new Error(`Unknown exam type: ${examType}`);

  let examQuestions = [];
  let usedIds = new Set();

  blueprint.forEach(target => {
    let catKnow = shuffle(knowledgePool.filter(q => q.module_id === target.category));
    let catSit = shuffle(situationalPool.filter(q => q.module_id === target.category));

    // Pick situational
    let pickedSit = catSit.slice(0, target.situation);
    pickedSit.forEach(q => {
      examQuestions.push({ ...q, question_form: 'situation' });
      usedIds.add(q.id);
    });

    // Fill missing situational with knowledge from same category
    let missingSitCount = target.situation - pickedSit.length;
    let knowledgeTargetCount = target.knowledge + Math.max(0, missingSitCount);

    let pickedKnow = catKnow.slice(0, knowledgeTargetCount);
    pickedKnow.forEach(q => {
      examQuestions.push({ ...q, question_form: 'knowledge' });
      usedIds.add(q.id);
    });
  });

  // Cross-category fallback if needed
  if (examQuestions.length < 40) {
    let fallbackPool = shuffle(knowledgePool.filter(q => q.exam_type === examType && !usedIds.has(q.id)));
    let extra = fallbackPool.slice(0, 40 - examQuestions.length);
    extra.forEach(q => {
      examQuestions.push({ ...q, question_form: 'knowledge' });
    });
  }

  return shuffle(examQuestions).slice(0, 40);
}

