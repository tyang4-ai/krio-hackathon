const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/database');
const OpenAI = require('openai');

/**
 * Generation Agent - Specialized AI agent for generating questions
 *
 * Responsibilities:
 * - Generate questions based on content and analysis patterns
 * - Use style guides from analysis agent
 * - Support all question types
 * - Apply user preferences and performance insights
 */
class GenerationAgent {
  constructor() {
    this.agentName = 'generation_agent';
    this.initializeClient();
  }

  initializeClient() {
    const provider = process.env.AI_PROVIDER || 'nvidia';

    switch(provider.toLowerCase()) {
      case 'groq':
        this.client = new OpenAI({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: 'https://api.groq.com/openai/v1'
        });
        this.model = process.env.AI_MODEL || 'mixtral-8x7b-32768';
        break;
      case 'together':
        this.client = new OpenAI({
          apiKey: process.env.TOGETHER_API_KEY,
          baseURL: 'https://api.together.xyz/v1'
        });
        this.model = process.env.AI_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
        break;
      case 'ollama':
        this.client = new OpenAI({
          apiKey: 'ollama',
          baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
        });
        this.model = process.env.AI_MODEL || 'mistral';
        break;
      case 'nvidia':
      default:
        this.client = new OpenAI({
          apiKey: process.env.NVIDIA_API_KEY,
          baseURL: 'https://integrate.api.nvidia.com/v1'
        });
        this.model = process.env.AI_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1';
    }
  }

  /**
   * Get pending messages from analysis agent
   */
  getPendingMessages(categoryId) {
    const stmt = db.prepare(`
      SELECT * FROM agent_messages
      WHERE category_id = ? AND to_agent = ? AND status = 'pending'
      ORDER BY created_at ASC
    `);
    return stmt.all(categoryId, this.agentName);
  }

  /**
   * Mark message as processed
   */
  markMessageProcessed(messageId) {
    const stmt = db.prepare(`
      UPDATE agent_messages
      SET status = 'processed', processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(messageId);
  }

  /**
   * Get analysis results from database
   */
  getAnalysisFromDB(categoryId) {
    const stmt = db.prepare(`
      SELECT * FROM ai_analysis_results
      WHERE category_id = ? AND analysis_type = 'sample_questions'
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    const result = stmt.get(categoryId);

    if (result) {
      return {
        patterns: JSON.parse(result.patterns || '{}'),
        styleGuide: JSON.parse(result.style_guide || '{}'),
        recommendations: JSON.parse(result.recommendations || '[]')
      };
    }
    return null;
  }

  /**
   * Generate questions using analysis patterns
   */
  async generateQuestions(content, options = {}) {
    const {
      categoryId,
      count = 10,
      difficulty = 'medium',
      questionType = 'multiple_choice',
      customDirections = '',
      aiInsights = null
    } = options;

    // Get analysis patterns from database
    const analysis = categoryId ? this.getAnalysisFromDB(categoryId) : null;

    // Build style guide section from analysis
    let styleGuideSection = '';
    if (analysis) {
      const { patterns, styleGuide, recommendations } = analysis;

      styleGuideSection = `
STYLE GUIDE (from sample question analysis):
Language Style: ${patterns.language_style || 'Not specified'}
Question Structure: ${patterns.question_structure || 'Not specified'}
Option Format: ${patterns.option_format || 'Not specified'}
Tone: ${styleGuide.tone || 'Professional'}
Vocabulary Level: ${styleGuide.vocabulary_level || 'Intermediate'}
Question Length: ${styleGuide.question_length || 'Medium'}

FORMATTING RULES:
${(styleGuide.formatting_rules || []).map(r => `- ${r}`).join('\n')}

RECOMMENDATIONS:
${(recommendations || []).map(r => `- ${r}`).join('\n')}

IMPORTANT: Follow these patterns closely when generating questions.
`;
    }

    // Build type-specific instructions
    let typeInstructions = '';
    let exampleFormat = {};

    switch (questionType) {
      case 'multiple_choice':
        typeInstructions = '- Provide 4 options (A, B, C, D) with only one correct answer\n- Make distractors plausible but clearly incorrect';
        exampleFormat = {
          question_text: "The question here",
          question_type: "multiple_choice",
          difficulty: difficulty,
          options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          correct_answer: "A",
          explanation: "Brief explanation of why this is correct",
          tags: ["topic1", "topic2"]
        };
        break;

      case 'true_false':
        typeInstructions = '- Create clear statements that are definitively true or false\n- Avoid ambiguous wording';
        exampleFormat = {
          question_text: "Statement to evaluate as true or false",
          question_type: "true_false",
          difficulty: difficulty,
          options: ["A) True", "B) False"],
          correct_answer: "A",
          explanation: "Brief explanation of why this is true/false",
          tags: ["topic1", "topic2"]
        };
        break;

      case 'written_answer':
        typeInstructions = '- Create open-ended questions requiring thoughtful responses\n- Provide comprehensive model answers';
        exampleFormat = {
          question_text: "Open-ended question requiring a written response",
          question_type: "written_answer",
          difficulty: difficulty,
          options: [],
          correct_answer: "Model answer: A comprehensive answer...",
          explanation: "Key points that should be included",
          tags: ["topic1", "topic2"]
        };
        break;

      case 'fill_in_blank':
        typeInstructions = '- Create sentences with _____ (five underscores) for blanks\n- Test key terms, concepts, values, or formulas\n- For scientific answers, use proper notation (H₂O, x², etc.)';
        exampleFormat = {
          question_text: "The chemical formula for water is _____.",
          question_type: "fill_in_blank",
          difficulty: difficulty,
          options: [],
          correct_answer: "H₂O",
          explanation: "Water consists of two hydrogen atoms and one oxygen atom",
          tags: ["topic1", "topic2"]
        };
        break;
    }

    // Build AI insights section
    let insightsSection = '';
    if (aiInsights) {
      insightsSection = this.buildInsightsSection(aiInsights);
    }

    // Build custom directions section
    let customSection = '';
    if (customDirections && customDirections.trim()) {
      customSection = `
CUSTOM INSTRUCTIONS:
${customDirections.trim()}
`;
    }

    const prompt = `Generate ${count} quiz questions based on the following content.

REQUIREMENTS:
- Difficulty: ${difficulty}
- Question Type: ${questionType}
${typeInstructions}
- Each question should test different concepts
- Provide clear, unambiguous questions
${styleGuideSection}${customSection}${insightsSection}
CONTENT:
${content.substring(0, 7000)}

Return questions in this JSON format:
{
  "questions": [
    ${JSON.stringify(exampleFormat, null, 2)}
  ]
}

Generate exactly ${count} questions. Respond ONLY with valid JSON.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator who creates high-quality quiz questions. Follow style guides precisely. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      let responseText = response.choices[0].message.content;

      // Clean response
      responseText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{[]*/, '')
        .replace(/[^}\]]*$/, '')
        .trim();

      const parsed = JSON.parse(responseText);

      // Log generation to agent messages
      await this.logGeneration(categoryId, questionType, count);

      return parsed.questions || [];

    } catch (error) {
      console.error('Generation Agent Error:', error);
      throw new Error('Failed to generate questions: ' + error.message);
    }
  }

  /**
   * Build insights section from user preferences
   */
  buildInsightsSection(aiInsights) {
    const sections = [];

    if (aiInsights.highlyRated && aiInsights.highlyRated.length > 0) {
      sections.push(`USER-PREFERRED STYLE (from high ratings):
${aiInsights.highlyRated.slice(0, 3).map(q =>
  `- "${q.question_text}" (${q.question_type}, rating: ${q.rating}/5)`
).join('\n')}`);
    }

    if (aiInsights.weakTopics && aiInsights.weakTopics.length > 0) {
      sections.push(`FOCUS AREAS (user needs practice):
${aiInsights.weakTopics.map(wt =>
  `- ${wt.question_type} at ${wt.difficulty} level (${Math.round(wt.avg_accuracy * 100)}% accuracy)`
).join('\n')}`);
    }

    if (aiInsights.performance && aiInsights.performance.total_answers > 0) {
      const accuracy = Math.round(aiInsights.performance.avg_accuracy * 100);
      sections.push(`PERFORMANCE: ${accuracy}% overall accuracy`);
    }

    return sections.length > 0 ? '\n' + sections.join('\n\n') + '\n' : '';
  }

  /**
   * Log generation activity
   */
  async logGeneration(categoryId, questionType, count) {
    if (!categoryId) return;

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO agent_messages (id, category_id, from_agent, to_agent, message_type, payload, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      categoryId,
      this.agentName,
      'controller_agent',
      'generation_complete',
      JSON.stringify({ questionType, count, timestamp: new Date().toISOString() }),
      'processed'
    );
  }
}

module.exports = new GenerationAgent();
