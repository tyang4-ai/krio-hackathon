const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/database');
const OpenAI = require('openai');

/**
 * Analysis Agent - Specialized AI agent for analyzing sample question patterns
 *
 * Responsibilities:
 * - Analyze sample questions to detect patterns
 * - Generate style guides for question generation
 * - Identify common structures, formats, and language patterns
 * - Store analysis results for use by the generation agent
 */
class AnalysisAgent {
  constructor() {
    this.agentName = 'analysis_agent';
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
   * Analyze sample questions and extract patterns
   */
  async analyzeSampleQuestions(categoryId, sampleQuestions) {
    if (!sampleQuestions || sampleQuestions.length === 0) {
      return {
        success: false,
        error: 'No sample questions to analyze'
      };
    }

    // Group samples by question type
    const byType = {};
    sampleQuestions.forEach(q => {
      const type = q.question_type || 'multiple_choice';
      if (!byType[type]) byType[type] = [];
      byType[type].push(q);
    });

    const prompt = `You are an expert educational content analyst. Analyze the following sample questions and extract detailed patterns for each question type.

SAMPLE QUESTIONS:
${sampleQuestions.map((q, i) => `
--- Question ${i + 1} (Type: ${q.question_type || 'multiple_choice'}) ---
Question: ${q.question_text}
Options: ${JSON.stringify(q.options || [])}
Correct Answer: ${q.correct_answer}
Explanation: ${q.explanation || 'None'}
`).join('\n')}

ANALYSIS INSTRUCTIONS:
Analyze these questions deeply and return a JSON object with the following structure:

{
  "patterns": {
    "language_style": "Description of the language style (formal/informal, tone, vocabulary level)",
    "question_structure": "Common structures used in questions",
    "option_format": "How options are formatted (length, style, distractors)",
    "answer_patterns": "Patterns in correct answers",
    "difficulty_indicators": "What makes questions easier or harder",
    "subject_focus": "Main topics or subjects covered"
  },
  "style_guide": {
    "tone": "Recommended tone for new questions",
    "vocabulary_level": "Appropriate vocabulary level",
    "question_length": "Typical question length (short/medium/long)",
    "option_count": "Number of options typically used",
    "explanation_style": "How explanations should be written",
    "formatting_rules": ["List of formatting rules to follow"]
  },
  "by_type": {
    "multiple_choice": {
      "count": 0,
      "patterns": "Specific patterns for this type",
      "examples": "Key characteristics"
    },
    "true_false": {
      "count": 0,
      "patterns": "Specific patterns for this type",
      "examples": "Key characteristics"
    },
    "written_answer": {
      "count": 0,
      "patterns": "Specific patterns for this type",
      "examples": "Key characteristics"
    },
    "fill_in_blank": {
      "count": 0,
      "patterns": "Specific patterns for this type",
      "examples": "Key characteristics"
    }
  },
  "recommendations": [
    "List of recommendations for generating similar questions"
  ],
  "quality_indicators": {
    "strengths": ["What these questions do well"],
    "areas_to_improve": ["What could be improved"]
  }
}

Respond ONLY with valid JSON, no other text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content analyst specializing in question pattern recognition. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      let responseText = response.choices[0].message.content;

      // Clean response
      responseText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();

      const analysis = JSON.parse(responseText);

      // Store analysis in database
      await this.storeAnalysis(categoryId, analysis, sampleQuestions.length);

      // Send message to generation agent
      await this.sendToGenerationAgent(categoryId, analysis);

      return {
        success: true,
        analysis,
        analyzedCount: sampleQuestions.length
      };

    } catch (error) {
      console.error('Analysis Agent Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store analysis results in database
   */
  async storeAnalysis(categoryId, analysis, analyzedCount) {
    const id = uuidv4();

    // Check if analysis exists for this category
    const existing = db.prepare('SELECT id FROM ai_analysis_results WHERE category_id = ? AND analysis_type = ?')
      .get(categoryId, 'sample_questions');

    if (existing) {
      // Update existing analysis
      const stmt = db.prepare(`
        UPDATE ai_analysis_results
        SET patterns = ?, style_guide = ?, recommendations = ?, analyzed_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        JSON.stringify(analysis.patterns || {}),
        JSON.stringify(analysis.style_guide || {}),
        JSON.stringify(analysis.recommendations || []),
        analyzedCount,
        existing.id
      );
    } else {
      // Insert new analysis
      const stmt = db.prepare(`
        INSERT INTO ai_analysis_results (id, category_id, analysis_type, patterns, style_guide, recommendations, analyzed_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        categoryId,
        'sample_questions',
        JSON.stringify(analysis.patterns || {}),
        JSON.stringify(analysis.style_guide || {}),
        JSON.stringify(analysis.recommendations || []),
        analyzedCount
      );
    }
  }

  /**
   * Send analysis results to generation agent via message queue
   */
  async sendToGenerationAgent(categoryId, analysis) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO agent_messages (id, category_id, from_agent, to_agent, message_type, payload, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      categoryId,
      this.agentName,
      'generation_agent',
      'analysis_complete',
      JSON.stringify(analysis),
      'pending'
    );
  }

  /**
   * Get stored analysis for a category
   */
  getAnalysis(categoryId) {
    const stmt = db.prepare(`
      SELECT * FROM ai_analysis_results
      WHERE category_id = ? AND analysis_type = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    const result = stmt.get(categoryId, 'sample_questions');

    if (result) {
      return {
        id: result.id,
        categoryId: result.category_id,
        patterns: JSON.parse(result.patterns || '{}'),
        styleGuide: JSON.parse(result.style_guide || '{}'),
        recommendations: JSON.parse(result.recommendations || '[]'),
        analyzedCount: result.analyzed_count,
        updatedAt: result.updated_at
      };
    }
    return null;
  }
}

module.exports = new AnalysisAgent();
