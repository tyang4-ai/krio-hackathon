/**
 * Grading Agent
 * Handles partial credit grading for complex questions (math, science, etc.)
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/database');
const aiService = require('../aiService');

class GradingAgent {
  constructor() {
    this.agentName = 'grading_agent';
  }

  /**
   * Grade an answer with partial credit support
   */
  async gradeAnswer(sessionId, questionId, userAnswer, options = {}) {
    const { isHandwritten = false, recognizedText = null } = options;

    // Get the question details
    const questionStmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    const question = questionStmt.get(questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    // Parse question data
    question.options = question.options ? JSON.parse(question.options) : [];
    question.tags = question.tags ? JSON.parse(question.tags) : [];

    // Determine answer text
    const answerText = isHandwritten && recognizedText ? recognizedText : userAnswer;

    // For simple question types, use standard grading
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      const isCorrect = answerText === question.correct_answer;
      return {
        questionId,
        totalPoints: 1.0,
        earnedPoints: isCorrect ? 1.0 : 0,
        isCorrect,
        breakdown: [],
        feedback: isCorrect ? 'Correct!' : `The correct answer was ${question.correct_answer}`,
        partialCredit: false
      };
    }

    // For written answers and fill-in-blank, check if partial credit is needed
    const needsPartialCredit = this.needsPartialCredit(question, answerText);

    if (needsPartialCredit) {
      return await this.gradeWithPartialCredit(sessionId, question, answerText);
    } else {
      // Simple exact match or close match
      const isCorrect = this.isAnswerCorrect(answerText, question.correct_answer);
      return {
        questionId,
        totalPoints: 1.0,
        earnedPoints: isCorrect ? 1.0 : 0,
        isCorrect,
        breakdown: [],
        feedback: isCorrect ? 'Correct!' : `Expected: ${question.correct_answer}`,
        partialCredit: false
      };
    }
  }

  /**
   * Determine if partial credit grading is needed
   */
  needsPartialCredit(question, answer) {
    // Check for complex question indicators
    const complexIndicators = [
      'math', 'physics', 'chemistry', 'calculate', 'solve', 'derive', 'prove',
      'equation', 'formula', 'step', 'show work', 'explain'
    ];

    const questionText = question.question_text.toLowerCase();
    const tags = question.tags.map(t => t.toLowerCase()).join(' ');
    const combined = questionText + ' ' + tags;

    // Check for math/science symbols in answer
    const hasComplexSymbols = /[²³⁴⁵⁶⁷⁸⁹⁰√∫∑∏±×÷=<>≤≥≠≈∞∂∆∇]/.test(answer);
    const hasMultipleSteps = (answer.match(/[.;:\n]/g) || []).length >= 2;

    return complexIndicators.some(ind => combined.includes(ind)) ||
           hasComplexSymbols ||
           hasMultipleSteps ||
           answer.length > 100;
  }

  /**
   * Grade with partial credit using AI
   */
  async gradeWithPartialCredit(sessionId, question, userAnswer) {
    const prompt = `You are an expert grader evaluating a student's answer. Award partial credit fairly.

QUESTION:
${question.question_text}

EXPECTED/MODEL ANSWER:
${question.correct_answer}

STUDENT'S ANSWER:
${userAnswer}

QUESTION TYPE: ${question.question_type}
DIFFICULTY: ${question.difficulty}
TAGS: ${JSON.stringify(question.tags)}

GRADING INSTRUCTIONS:
1. Break down the expected answer into key components/steps
2. Evaluate which components the student got correct
3. Award partial credit proportionally
4. For math/science: Give credit for correct setup even if final answer is wrong
5. For formulas: Accept equivalent forms (e.g., E=mc² is same as E=m*c^2)
6. Be lenient with minor notation differences

Return your evaluation as JSON:
{
  "totalPoints": 1.0,
  "earnedPoints": 0.75,
  "breakdown": [
    {
      "component": "Setup/Initial Approach",
      "maxPoints": 0.25,
      "earnedPoints": 0.25,
      "correct": true,
      "feedback": "Correctly identified the formula to use"
    },
    {
      "component": "Calculation Steps",
      "maxPoints": 0.5,
      "earnedPoints": 0.35,
      "correct": false,
      "feedback": "Minor arithmetic error in step 2"
    },
    {
      "component": "Final Answer",
      "maxPoints": 0.25,
      "earnedPoints": 0.15,
      "correct": false,
      "feedback": "Close but incorrect due to earlier error"
    }
  ],
  "overallFeedback": "Good understanding of the concept. Watch your arithmetic.",
  "correctParts": ["Correct formula used", "Proper units"],
  "incorrectParts": ["Arithmetic error in multiplication"],
  "suggestions": ["Double-check calculations", "Write out intermediate steps"]
}`;

    try {
      const response = await aiService.generateRawResponse(prompt);
      const grading = JSON.parse(response);

      // Store partial credit result
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO partial_credit_grades (id, session_id, question_id, total_points, earned_points, breakdown, feedback)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        sessionId,
        question.id,
        grading.totalPoints,
        grading.earnedPoints,
        JSON.stringify(grading.breakdown),
        grading.overallFeedback
      );

      // Log grading activity
      this.logActivity(question.category_id, 'partial_credit_grading', {
        questionId: question.id,
        earnedPoints: grading.earnedPoints,
        totalPoints: grading.totalPoints
      });

      return {
        questionId: question.id,
        totalPoints: grading.totalPoints,
        earnedPoints: grading.earnedPoints,
        isCorrect: grading.earnedPoints >= grading.totalPoints * 0.9,
        breakdown: grading.breakdown,
        feedback: grading.overallFeedback,
        correctParts: grading.correctParts || [],
        incorrectParts: grading.incorrectParts || [],
        suggestions: grading.suggestions || [],
        partialCredit: true
      };
    } catch (error) {
      console.error('AI grading error:', error);
      // Fallback to simple comparison
      const isCorrect = this.isAnswerCorrect(userAnswer, question.correct_answer);
      return {
        questionId: question.id,
        totalPoints: 1.0,
        earnedPoints: isCorrect ? 1.0 : 0,
        isCorrect,
        breakdown: [],
        feedback: isCorrect ? 'Correct!' : `Expected: ${question.correct_answer}`,
        partialCredit: false
      };
    }
  }

  /**
   * Simple answer comparison with tolerance
   */
  isAnswerCorrect(userAnswer, correctAnswer) {
    if (!userAnswer || !correctAnswer) return false;

    // Normalize both answers
    const normalize = (str) => str.toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,;:!?]/g, '');

    const userNorm = normalize(userAnswer);
    const correctNorm = normalize(correctAnswer);

    // Exact match
    if (userNorm === correctNorm) return true;

    // Check for equivalent mathematical expressions
    const mathEquivalents = this.checkMathEquivalence(userAnswer, correctAnswer);
    if (mathEquivalents) return true;

    // Check for numeric equivalence (within tolerance)
    const userNum = parseFloat(userAnswer);
    const correctNum = parseFloat(correctAnswer);
    if (!isNaN(userNum) && !isNaN(correctNum)) {
      const tolerance = Math.abs(correctNum) * 0.01; // 1% tolerance
      if (Math.abs(userNum - correctNum) <= tolerance) return true;
    }

    return false;
  }

  /**
   * Check for mathematically equivalent expressions
   */
  checkMathEquivalence(expr1, expr2) {
    // Simple equivalence patterns
    const equivalences = [
      [/x²/g, 'x^2'],
      [/x³/g, 'x^3'],
      [/√/g, 'sqrt'],
      [/×/g, '*'],
      [/÷/g, '/'],
      [/π/g, 'pi'],
      [/\s/g, '']
    ];

    let norm1 = expr1.toString().toLowerCase();
    let norm2 = expr2.toString().toLowerCase();

    for (const [pattern, replacement] of equivalences) {
      norm1 = norm1.replace(pattern, replacement);
      norm2 = norm2.replace(pattern, replacement);
    }

    return norm1 === norm2;
  }

  /**
   * Get partial credit grade for a question in a session
   */
  getPartialCreditGrade(sessionId, questionId) {
    const stmt = db.prepare(`
      SELECT * FROM partial_credit_grades
      WHERE session_id = ? AND question_id = ?
    `);
    const grade = stmt.get(sessionId, questionId);
    if (grade && grade.breakdown) {
      grade.breakdown = JSON.parse(grade.breakdown);
    }
    return grade;
  }

  /**
   * Get all partial credit grades for a session
   */
  getSessionGrades(sessionId) {
    const stmt = db.prepare(`
      SELECT * FROM partial_credit_grades WHERE session_id = ?
    `);
    const grades = stmt.all(sessionId);
    return grades.map(g => ({
      ...g,
      breakdown: g.breakdown ? JSON.parse(g.breakdown) : []
    }));
  }

  /**
   * Calculate total score with partial credits
   */
  calculateTotalScore(sessionId, results) {
    let totalPossible = 0;
    let totalEarned = 0;

    for (const result of results) {
      const partialGrade = this.getPartialCreditGrade(sessionId, result.question_id);

      if (partialGrade) {
        totalPossible += partialGrade.total_points;
        totalEarned += partialGrade.earned_points;
      } else {
        totalPossible += 1;
        totalEarned += result.is_correct ? 1 : 0;
      }
    }

    return {
      totalPossible,
      totalEarned,
      percentage: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0
    };
  }

  /**
   * Log agent activity
   */
  logActivity(categoryId, activityType, details) {
    if (!categoryId) return;

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO agent_messages (id, category_id, from_agent, to_agent, message_type, payload, status)
      VALUES (?, ?, ?, ?, ?, ?, 'processed')
    `);
    stmt.run(
      id,
      categoryId,
      this.agentName,
      'controller_agent',
      activityType,
      JSON.stringify(details)
    );
  }
}

module.exports = new GradingAgent();
