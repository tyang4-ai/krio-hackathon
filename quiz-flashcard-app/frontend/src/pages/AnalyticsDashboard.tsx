import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { ArrowLeft, TrendingUp, Target, Clock, Award, Calendar, BookOpen, Brain, Flame, X, Info, Download } from 'lucide-react';
import { analyticsApi, categoryApi } from '../services/api';
import { exportAnalyticsToPDF } from '../services/pdfExport';
import { useError } from '../contexts/ErrorContext';
import type { AnalyticsDashboard as AnalyticsDashboardType, Category } from '../types';

// Score explanation data based on learning science research
const scoreExplanations: Record<string, { title: string; description: string; howCalculated: string; tips: string[] }> = {
  accuracy: {
    title: 'Accuracy Score',
    description: 'Measures the percentage of questions you answer correctly. Research shows that achieving 80%+ accuracy indicates strong comprehension, while scores below 60% suggest the material needs more review.',
    howCalculated: 'Calculated as (correct answers / total attempts) × 100. Your score is weighted to give more importance to recent performance.',
    tips: [
      'Focus on understanding concepts rather than memorizing answers',
      'Review incorrect answers immediately after each quiz',
      'Space out your practice sessions for better retention'
    ]
  },
  consistency: {
    title: 'Consistency Score',
    description: 'Tracks how regularly you study over time. Based on the "spacing effect" in cognitive psychology, consistent daily practice leads to 50% better long-term retention compared to cramming.',
    howCalculated: 'Based on your study streak, frequency of practice sessions, and regularity of engagement over the selected time period.',
    tips: [
      'Aim for at least 15-30 minutes of practice daily',
      'Set a regular study schedule at the same time each day',
      'Use the streak feature to maintain motivation'
    ]
  },
  improvement: {
    title: 'Improvement Score',
    description: 'Measures your learning trajectory over time. This score reflects the "testing effect" - the more you practice retrieving information, the stronger your memory becomes.',
    howCalculated: 'Compares your recent accuracy to your historical performance, weighted by the difficulty of questions attempted.',
    tips: [
      'Challenge yourself with harder questions as you improve',
      'Review questions you previously got wrong',
      'Track your progress weekly to stay motivated'
    ]
  },
  difficulty: {
    title: 'Difficulty Score',
    description: 'Reflects your ability to handle challenging questions. Research shows that "desirable difficulty" - working on questions just beyond your comfort zone - accelerates learning.',
    howCalculated: 'Based on your accuracy rate on medium and hard questions, with higher weight given to successfully answering difficult questions.',
    tips: [
      'Gradually increase difficulty as you master easier content',
      'Don\'t avoid hard questions - they build stronger neural pathways',
      'Use the "Questions to Review" section to target weaknesses'
    ]
  },
  total: {
    title: 'AI Learning Score',
    description: 'A comprehensive metric combining all aspects of your learning performance. This holistic score is inspired by research on metacognition and self-regulated learning.',
    howCalculated: 'Weighted average: Accuracy (40%) + Consistency (20%) + Improvement (25%) + Difficulty (15%). The grade reflects overall mastery level.',
    tips: [
      'Balance all four components for optimal learning',
      'Focus on your weakest score area for fastest improvement',
      'Aim for consistent incremental progress over time'
    ]
  }
};

type ExplanationKey = keyof typeof scoreExplanations;

function AnalyticsDashboard(): React.ReactElement {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AnalyticsDashboardType | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [explanationModal, setExplanationModal] = useState<ExplanationKey | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const { showSuccess, showError } = useError();

  useEffect(() => {
    loadData();
  }, [selectedCategory, days]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async (): Promise<void> => {
    try {
      const response = await categoryApi.getAll();
      const data = response.data.data || response.data;
      setCategories((data as any).categories || data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getDashboard(selectedCategory, days);
      const data = response.data.data || response.data;
      setDashboard(data as AnalyticsDashboardType);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (): Promise<void> => {
    if (!dashboard) return;

    setExporting(true);
    try {
      const categoryName = selectedCategory
        ? categories.find(c => c.id === selectedCategory)?.name
        : undefined;

      await exportAnalyticsToPDF(dashboard, categoryName, days);
      showSuccess('Export Complete', 'Your analytics report has been downloaded');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showError('Export Failed', 'Could not generate the PDF report');
    } finally {
      setExporting(false);
    }
  };

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    if (grade.startsWith('D')) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBgColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'bg-green-100';
    if (grade.startsWith('B')) return 'bg-blue-100';
    if (grade.startsWith('C')) return 'bg-yellow-100';
    if (grade.startsWith('D')) return 'bg-orange-100';
    return 'bg-red-100';
  };

  // Chart configurations
  const getTrendChartOption = () => {
    if (!dashboard?.trend_data?.length) return null;

    const dates = dashboard.trend_data.map(d => d.date);
    const attempts = dashboard.trend_data.map(d => d.attempts);
    const accuracy = dashboard.trend_data.map(d => d.accuracy);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Questions Attempted', 'Accuracy %'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: 45,
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Questions',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Accuracy %',
          position: 'right',
          max: 100,
          axisLabel: {
            formatter: '{value}%'
          }
        }
      ],
      series: [
        {
          name: 'Questions Attempted',
          type: 'bar',
          data: attempts,
          itemStyle: { color: '#6366f1' }
        },
        {
          name: 'Accuracy %',
          type: 'line',
          yAxisIndex: 1,
          data: accuracy,
          smooth: true,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 }
        }
      ]
    };
  };

  const getCategoryChartOption = () => {
    if (!dashboard?.category_performance?.length) return null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}% accuracy'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'center'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: dashboard.category_performance.map(cat => ({
            value: Math.round(cat.accuracy),
            name: cat.category_name,
            itemStyle: { color: cat.color }
          }))
        }
      ]
    };
  };

  const getDifficultyChartOption = () => {
    if (!dashboard?.difficulty_breakdown) return null;

    const difficulties = ['easy', 'medium', 'hard'];
    const data = difficulties.map(d => {
      const breakdown = dashboard.difficulty_breakdown[d];
      return {
        name: d.charAt(0).toUpperCase() + d.slice(1),
        total: breakdown?.total || 0,
        correct: breakdown?.correct || 0,
        accuracy: breakdown?.accuracy || 0
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const d = data[params[0].dataIndex];
          return `${d.name}<br/>Total: ${d.total}<br/>Correct: ${d.correct}<br/>Accuracy: ${d.accuracy.toFixed(1)}%`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name)
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          type: 'bar',
          data: data.map(d => ({
            value: d.accuracy,
            itemStyle: {
              color: d.name === 'Easy' ? '#10b981' : d.name === 'Medium' ? '#f59e0b' : '#ef4444'
            }
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%'
          }
        }
      ]
    };
  };

  const getQuestionTypeChartOption = () => {
    if (!dashboard?.question_type_breakdown) return null;

    const types = Object.entries(dashboard.question_type_breakdown).map(([type, data]) => ({
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      accuracy: data.accuracy,
      total: data.total,
      avgTime: data.avg_time
    }));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: types.map(t => t.name),
        axisLabel: {
          rotate: 30,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          type: 'bar',
          data: types.map(t => t.accuracy),
          itemStyle: { color: '#8b5cf6' },
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%'
          }
        }
      ]
    };
  };

  const getScoreColor = (score: number): string => {
    if (score < 30) return '#ef4444'; // red
    if (score < 50) return '#f59e0b'; // orange
    if (score < 70) return '#eab308'; // yellow
    if (score < 85) return '#22c55e'; // green
    return '#10b981'; // emerald
  };

  const getLearningScoreGaugeOption = () => {
    if (!dashboard?.learning_score) return null;

    const score = dashboard.learning_score.total_score;
    const scoreColor = getScoreColor(score);

    return {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          center: ['50%', '70%'],
          radius: '100%',
          min: 0,
          max: 100,
          splitNumber: 2,
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.3, '#ef4444'],
                [0.5, '#f59e0b'],
                [0.7, '#eab308'],
                [0.85, '#22c55e'],
                [1, '#10b981']
              ]
            }
          },
          pointer: {
            itemStyle: {
              color: '#1f2937'
            },
            length: '60%',
            width: 5
          },
          axisTick: {
            show: false
          },
          splitLine: {
            length: 12,
            lineStyle: {
              color: 'auto',
              width: 2
            }
          },
          axisLabel: {
            show: false
          },
          title: {
            show: false
          },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 'bold',
            formatter: '{value}',
            color: scoreColor,
            offsetCenter: [0, '30%']
          },
          data: [
            {
              value: Math.round(score)
            }
          ]
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadData} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const overview = dashboard?.overview;
  const learningScore = dashboard?.learning_score;

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Home
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learning Analytics</h1>
          <p className="text-gray-600 mt-1">Track your progress and identify areas for improvement</p>
        </div>

        <div className="flex gap-4">
          <select
            className="select min-w-[160px]"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            className="select min-w-[130px]"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>

          <button
            onClick={handleExportPDF}
            disabled={exporting || !dashboard}
            className="btn-secondary flex items-center gap-2"
            title="Export analytics report as PDF"
          >
            <Download className={`h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Learning Score Card */}
      {learningScore && (
        <div className="card mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div
              className="w-48 h-40 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setExplanationModal('total')}
              title="Click to learn more about your Learning Score"
            >
              <ReactECharts
                option={getLearningScoreGaugeOption() || {}}
                style={{ height: '100%', width: '100%' }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">AI Learning Score</h2>
                <button
                  onClick={() => setExplanationModal('total')}
                  className={`px-3 py-1 rounded-full text-lg font-bold cursor-pointer hover:opacity-80 transition-opacity ${getGradeBgColor(learningScore.grade)} ${getGradeColor(learningScore.grade)}`}
                  title="Click to learn more"
                >
                  {learningScore.grade}
                </button>
                <button
                  onClick={() => setExplanationModal('total')}
                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                  title="What is this score?"
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">{learningScore.recommendation}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setExplanationModal('accuracy')}
                  className="text-center p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                  title="Click to learn about Accuracy Score"
                >
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    Accuracy
                    <Info className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="text-lg font-semibold text-green-600">{learningScore.accuracy_score.toFixed(0)}</div>
                </button>
                <button
                  onClick={() => setExplanationModal('consistency')}
                  className="text-center p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                  title="Click to learn about Consistency Score"
                >
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    Consistency
                    <Info className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="text-lg font-semibold text-blue-600">{learningScore.consistency_score.toFixed(0)}</div>
                </button>
                <button
                  onClick={() => setExplanationModal('improvement')}
                  className="text-center p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                  title="Click to learn about Improvement Score"
                >
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    Improvement
                    <Info className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="text-lg font-semibold text-purple-600">{learningScore.improvement_score.toFixed(0)}</div>
                </button>
                <button
                  onClick={() => setExplanationModal('difficulty')}
                  className="text-center p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                  title="Click to learn about Difficulty Score"
                >
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    Difficulty
                    <Info className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="text-lg font-semibold text-orange-600">{learningScore.difficulty_score.toFixed(0)}</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview?.total_attempts || 0}</div>
              <div className="text-sm text-gray-600">Questions Attempted</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{(overview?.accuracy || 0).toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Accuracy Rate</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{(overview?.avg_time_per_question || 0).toFixed(1)}s</div>
              <div className="text-sm text-gray-600">Avg Time/Question</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview?.streak_days || 0}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <Calendar className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{overview?.sessions_completed || 0}</div>
          <div className="text-sm text-gray-600">Sessions Completed</div>
        </div>
        <div className="card text-center">
          <Award className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{overview?.correct_count || 0}</div>
          <div className="text-sm text-gray-600">Correct Answers</div>
        </div>
        <div className="card text-center">
          <TrendingUp className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{(overview?.total_time_minutes || 0).toFixed(0)}m</div>
          <div className="text-sm text-gray-600">Total Study Time</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Over Time</h3>
          {getTrendChartOption() ? (
            <ReactECharts option={getTrendChartOption()!} style={{ height: 300 }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No trend data available yet. Complete some quizzes to see your progress!
            </div>
          )}
        </div>

        {/* Category Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Category</h3>
          {getCategoryChartOption() ? (
            <ReactECharts option={getCategoryChartOption()!} style={{ height: 300 }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No category data available yet. Complete quizzes across different categories!
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Difficulty Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accuracy by Difficulty</h3>
          {getDifficultyChartOption() ? (
            <ReactECharts option={getDifficultyChartOption()!} style={{ height: 300 }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No difficulty data available yet.
            </div>
          )}
        </div>

        {/* Question Type Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accuracy by Question Type</h3>
          {getQuestionTypeChartOption() ? (
            <ReactECharts option={getQuestionTypeChartOption()!} style={{ height: 300 }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No question type data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Hardest Questions */}
      {dashboard?.hardest_questions && dashboard.hardest_questions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions to Review</h3>
          <p className="text-sm text-gray-600 mb-4">These questions have given you the most trouble. Consider reviewing them!</p>
          <div className="space-y-3">
            {dashboard.hardest_questions.map((q, index) => (
              <div key={q.question_id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{q.question_text}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>{q.attempts} attempts</span>
                    <span>{q.accuracy.toFixed(0)}% accuracy</span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Explanation Modal */}
      {explanationModal && scoreExplanations[explanationModal] && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setExplanationModal(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  explanationModal === 'accuracy' ? 'bg-green-100' :
                  explanationModal === 'consistency' ? 'bg-blue-100' :
                  explanationModal === 'improvement' ? 'bg-purple-100' :
                  explanationModal === 'difficulty' ? 'bg-orange-100' :
                  'bg-indigo-100'
                }`}>
                  <Brain className={`h-5 w-5 ${
                    explanationModal === 'accuracy' ? 'text-green-600' :
                    explanationModal === 'consistency' ? 'text-blue-600' :
                    explanationModal === 'improvement' ? 'text-purple-600' :
                    explanationModal === 'difficulty' ? 'text-orange-600' :
                    'text-indigo-600'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {scoreExplanations[explanationModal].title}
                </h3>
              </div>
              <button
                onClick={() => setExplanationModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Current Score Display */}
            {learningScore && (
              <div className={`p-4 rounded-lg mb-4 ${
                explanationModal === 'accuracy' ? 'bg-green-50 border border-green-200' :
                explanationModal === 'consistency' ? 'bg-blue-50 border border-blue-200' :
                explanationModal === 'improvement' ? 'bg-purple-50 border border-purple-200' :
                explanationModal === 'difficulty' ? 'bg-orange-50 border border-orange-200' :
                'bg-indigo-50 border border-indigo-200'
              }`}>
                <div className="text-sm text-gray-600 mb-1">Your Current Score</div>
                <div className={`text-3xl font-bold ${
                  explanationModal === 'accuracy' ? 'text-green-600' :
                  explanationModal === 'consistency' ? 'text-blue-600' :
                  explanationModal === 'improvement' ? 'text-purple-600' :
                  explanationModal === 'difficulty' ? 'text-orange-600' :
                  'text-indigo-600'
                }`}>
                  {explanationModal === 'accuracy' ? learningScore.accuracy_score.toFixed(0) :
                   explanationModal === 'consistency' ? learningScore.consistency_score.toFixed(0) :
                   explanationModal === 'improvement' ? learningScore.improvement_score.toFixed(0) :
                   explanationModal === 'difficulty' ? learningScore.difficulty_score.toFixed(0) :
                   learningScore.total_score.toFixed(0)}
                  <span className="text-lg text-gray-500 ml-1">/ 100</span>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">What is this?</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                {scoreExplanations[explanationModal].description}
              </p>
            </div>

            {/* How it's calculated */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">How it's calculated</h4>
              <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                {scoreExplanations[explanationModal].howCalculated}
              </p>
            </div>

            {/* Tips */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Tips to Improve</h4>
              <ul className="space-y-2">
                {scoreExplanations[explanationModal].tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setExplanationModal(null)}
              className="mt-6 w-full btn-primary"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
