const { v4: uuidv4 } = require('uuid');
const { db } = require('../../config/database');
const analysisAgent = require('./analysisAgent');
const generationAgent = require('./generationAgent');
const sampleQuestionService = require('../sampleQuestionService');
const userPreferencesService = require('../userPreferencesService');

/**
 * Controller Agent - Main coordinator for multi-agent system
 *
 * Responsibilities:
 * - Coordinate between analysis and generation agents
 * - Manage workflow for question generation
 * - Handle requests and route to appropriate agents
 * - Aggregate results and maintain consistency
 */
class ControllerAgent {
  constructor() {
    this.agentName = 'controller_agent';
  }

  /**
   * Trigger analysis of sample questions
   */
  async triggerAnalysis(categoryId) {
    try {
      // Get sample questions for this category
      const sampleQuestions = sampleQuestionService.getSampleQuestionsByCategory(categoryId);

      if (!sampleQuestions || sampleQuestions.length === 0) {
        return {
          success: false,
          error: 'No sample questions found for analysis'
        };
      }

      // Log the request
      await this.logMessage(categoryId, 'user', this.agentName, 'analysis_request', {
        sampleCount: sampleQuestions.length
      });

      // Delegate to analysis agent
      const result = await analysisAgent.analyzeSampleQuestions(categoryId, sampleQuestions);

      // Log completion
      await this.logMessage(categoryId, this.agentName, 'user', 'analysis_response', {
        success: result.success,
        analyzedCount: result.analyzedCount
      });

      return result;

    } catch (error) {
      console.error('Controller Agent - Analysis Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate questions with full coordination
   */
  async generateQuestions(content, options = {}) {
    const {
      categoryId,
      count = 10,
      difficulty = 'medium',
      questionType = 'multiple_choice',
      customDirections = '',
      useAnalysis = true,
      useSampleQuestions = true
    } = options;

    try {
      // Log generation request
      await this.logMessage(categoryId, 'user', this.agentName, 'generation_request', {
        count, difficulty, questionType
      });

      // Get AI insights from user preferences
      let aiInsights = null;
      if (categoryId) {
        aiInsights = userPreferencesService.getAIInsights(categoryId);
      }

      // Check if analysis exists and is recent
      let analysis = null;
      if (useAnalysis && categoryId) {
        analysis = analysisAgent.getAnalysis(categoryId);

        // If no analysis exists but we have sample questions, trigger analysis first
        if (!analysis && useSampleQuestions) {
          const sampleCount = sampleQuestionService.getSampleQuestionCount(categoryId);
          if (sampleCount > 0) {
            console.log('Controller: Triggering auto-analysis before generation...');
            await this.triggerAnalysis(categoryId);
          }
        }
      }

      // Delegate to generation agent
      const questions = await generationAgent.generateQuestions(content, {
        categoryId,
        count,
        difficulty,
        questionType,
        customDirections,
        aiInsights
      });

      // Log completion
      await this.logMessage(categoryId, this.agentName, 'user', 'generation_response', {
        success: true,
        generatedCount: questions.length
      });

      return questions;

    } catch (error) {
      console.error('Controller Agent - Generation Error:', error);
      throw error;
    }
  }

  /**
   * Get analysis status and results
   */
  getAnalysisStatus(categoryId) {
    const analysis = analysisAgent.getAnalysis(categoryId);
    const sampleCount = sampleQuestionService.getSampleQuestionCount(categoryId);
    const sampleQuestions = sampleQuestionService.getSampleQuestionsByCategory(categoryId);

    // Count by type
    const byType = {
      multiple_choice: 0,
      true_false: 0,
      written_answer: 0,
      fill_in_blank: 0
    };

    sampleQuestions.forEach(q => {
      const type = q.question_type || 'multiple_choice';
      if (byType[type] !== undefined) {
        byType[type]++;
      }
    });

    return {
      hasAnalysis: !!analysis,
      analysis: analysis,
      sampleCount,
      samplesByType: byType,
      lastUpdated: analysis?.updatedAt || null
    };
  }

  /**
   * Get agent activity log
   */
  getAgentActivity(categoryId, limit = 20) {
    const stmt = db.prepare(`
      SELECT * FROM agent_messages
      WHERE category_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const messages = stmt.all(categoryId, limit);

    return messages.map(m => ({
      id: m.id,
      from: m.from_agent,
      to: m.to_agent,
      type: m.message_type,
      payload: JSON.parse(m.payload || '{}'),
      status: m.status,
      createdAt: m.created_at,
      processedAt: m.processed_at
    }));
  }

  /**
   * Clear analysis for a category (force re-analysis)
   */
  clearAnalysis(categoryId) {
    const stmt = db.prepare('DELETE FROM ai_analysis_results WHERE category_id = ?');
    stmt.run(categoryId);

    // Log the action
    this.logMessage(categoryId, 'user', this.agentName, 'analysis_cleared', {});

    return { success: true };
  }

  /**
   * Log message to agent communication table
   */
  async logMessage(categoryId, fromAgent, toAgent, messageType, payload) {
    if (!categoryId) return;

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO agent_messages (id, category_id, from_agent, to_agent, message_type, payload, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      categoryId,
      fromAgent,
      toAgent,
      messageType,
      JSON.stringify(payload),
      'processed'
    );
  }

  /**
   * Get summary statistics for the multi-agent system
   */
  getSystemStats(categoryId) {
    const analysisStmt = db.prepare(`
      SELECT COUNT(*) as count FROM ai_analysis_results WHERE category_id = ?
    `);
    const analysisCount = analysisStmt.get(categoryId)?.count || 0;

    const messageStmt = db.prepare(`
      SELECT message_type, COUNT(*) as count
      FROM agent_messages
      WHERE category_id = ?
      GROUP BY message_type
    `);
    const messageStats = messageStmt.all(categoryId);

    const recentStmt = db.prepare(`
      SELECT * FROM agent_messages
      WHERE category_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `);
    const recentActivity = recentStmt.all(categoryId);

    return {
      analysisCount,
      messageStats: messageStats.reduce((acc, m) => {
        acc[m.message_type] = m.count;
        return acc;
      }, {}),
      recentActivity: recentActivity.map(m => ({
        type: m.message_type,
        from: m.from_agent,
        to: m.to_agent,
        createdAt: m.created_at
      }))
    };
  }
}

module.exports = new ControllerAgent();
