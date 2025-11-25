/**
 * Handwriting Recognition Agent
 * Analyzes handwritten PDF answers using AI vision capabilities
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/database');
const aiService = require('../aiService');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

class HandwritingAgent {
  constructor() {
    this.agentName = 'handwriting_agent';
  }

  /**
   * Process a handwritten PDF answer
   */
  async processHandwrittenAnswer(sessionId, questionId, filePath, originalName) {
    const id = uuidv4();

    try {
      // Extract text/image from PDF
      const extractedContent = await this.extractPDFContent(filePath);

      // Get the question for context
      const questionStmt = db.prepare('SELECT * FROM questions WHERE id = ?');
      const question = questionStmt.get(questionId);

      // Get any learned corrections for this category
      const corrections = this.getLearnedCorrections(question?.category_id);

      // Recognize handwriting using AI
      const recognition = await this.recognizeHandwriting(
        extractedContent,
        question,
        corrections
      );

      // Store the handwritten answer record
      const stmt = db.prepare(`
        INSERT INTO handwritten_answers (id, session_id, question_id, file_path, original_name, recognized_text, confidence_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        sessionId,
        questionId,
        filePath,
        originalName,
        recognition.text,
        recognition.confidence
      );

      // Log agent activity
      this.logActivity(question?.category_id, 'handwriting_recognition', {
        sessionId,
        questionId,
        confidence: recognition.confidence
      });

      return {
        id,
        recognizedText: recognition.text,
        confidence: recognition.confidence,
        segments: recognition.segments,
        suggestions: recognition.suggestions
      };
    } catch (error) {
      console.error('Handwriting recognition error:', error);
      throw error;
    }
  }

  /**
   * Extract content from PDF file
   */
  async extractPDFContent(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);

      return {
        text: pdfData.text,
        pageCount: pdfData.numpages,
        // For actual image-based handwriting, we'd need OCR or vision API
        // This is a simplified version that extracts any embedded text
        rawContent: dataBuffer.toString('base64')
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      return { text: '', pageCount: 0, rawContent: '' };
    }
  }

  /**
   * Recognize handwriting using AI
   */
  async recognizeHandwriting(content, question, corrections) {
    const prompt = `You are a handwriting recognition specialist analyzing a student's handwritten answer.

QUESTION CONTEXT:
Question: ${question?.question_text || 'Unknown question'}
Expected Answer Type: ${question?.question_type || 'written_answer'}
Subject/Tags: ${JSON.stringify(question?.tags || [])}

EXTRACTED CONTENT FROM PDF:
${content.text || 'No text extracted - image-based content'}

${corrections.length > 0 ? `
LEARNED CORRECTIONS (Use these to improve recognition):
${corrections.map(c => `"${c.original_text}" should be "${c.corrected_text}"`).join('\n')}
` : ''}

TASK:
1. Analyze the content and recognize the handwritten text
2. For mathematical expressions, use proper notation (e.g., x², √, ∫, etc.)
3. For chemical formulas, use proper subscripts/superscripts
4. Break down the answer into segments for partial credit evaluation
5. Provide confidence score (0-1) for each segment

Return your analysis as JSON:
{
  "text": "The full recognized text",
  "confidence": 0.85,
  "segments": [
    {
      "text": "First part of answer",
      "type": "equation|text|formula|diagram_description",
      "confidence": 0.9,
      "position": "beginning|middle|end"
    }
  ],
  "suggestions": ["Any alternative interpretations"],
  "subject_specific": {
    "formulas_detected": ["H₂O", "x² + y²"],
    "units_detected": ["m/s", "kg"],
    "symbols_detected": ["√", "∫"]
  }
}`;

    try {
      const response = await aiService.generateRawResponse(prompt);
      const parsed = JSON.parse(response);

      return {
        text: parsed.text || content.text || '',
        confidence: parsed.confidence || 0.5,
        segments: parsed.segments || [],
        suggestions: parsed.suggestions || [],
        subjectSpecific: parsed.subject_specific || {}
      };
    } catch (error) {
      console.error('AI recognition error:', error);
      // Fallback to extracted text
      return {
        text: content.text || '',
        confidence: 0.3,
        segments: [{ text: content.text || '', type: 'text', confidence: 0.3 }],
        suggestions: [],
        subjectSpecific: {}
      };
    }
  }

  /**
   * Get learned corrections for a category
   */
  getLearnedCorrections(categoryId) {
    if (!categoryId) return [];

    const stmt = db.prepare(`
      SELECT original_text, corrected_text, context
      FROM handwriting_corrections
      WHERE category_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `);
    return stmt.all(categoryId);
  }

  /**
   * Learn from user corrections
   */
  learnCorrection(categoryId, originalText, correctedText, context = '') {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO handwriting_corrections (id, category_id, original_text, corrected_text, context)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, categoryId, originalText, correctedText, context);

    this.logActivity(categoryId, 'correction_learned', {
      original: originalText,
      corrected: correctedText
    });

    return { id, success: true };
  }

  /**
   * Update recognized text after user correction
   */
  updateRecognizedText(handwrittenAnswerId, correctedText, corrections) {
    const stmt = db.prepare(`
      UPDATE handwritten_answers
      SET recognized_text = ?, user_corrections = ?
      WHERE id = ?
    `);
    stmt.run(correctedText, JSON.stringify(corrections), handwrittenAnswerId);

    // Learn from each correction
    const answerStmt = db.prepare(`
      SELECT ha.*, q.category_id
      FROM handwritten_answers ha
      JOIN questions q ON ha.question_id = q.id
      WHERE ha.id = ?
    `);
    const answer = answerStmt.get(handwrittenAnswerId);

    if (answer && corrections && corrections.length > 0) {
      for (const correction of corrections) {
        this.learnCorrection(
          answer.category_id,
          correction.original,
          correction.corrected,
          answer.question_id
        );
      }
    }

    return { success: true };
  }

  /**
   * Get handwritten answer by ID
   */
  getHandwrittenAnswer(id) {
    const stmt = db.prepare('SELECT * FROM handwritten_answers WHERE id = ?');
    const answer = stmt.get(id);
    if (answer && answer.user_corrections) {
      answer.user_corrections = JSON.parse(answer.user_corrections);
    }
    return answer;
  }

  /**
   * Get all handwritten answers for a session
   */
  getSessionHandwrittenAnswers(sessionId) {
    const stmt = db.prepare(`
      SELECT * FROM handwritten_answers WHERE session_id = ?
    `);
    const answers = stmt.all(sessionId);
    return answers.map(a => ({
      ...a,
      user_corrections: a.user_corrections ? JSON.parse(a.user_corrections) : []
    }));
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
      'grading_agent',
      activityType,
      JSON.stringify(details)
    );
  }
}

module.exports = new HandwritingAgent();
