import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Trash2, AlertTriangle, Filter } from 'lucide-react';
import { notebookApi, categoryApi } from '../services/api';

function NotebookPage() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [entries, setEntries] = useState([]);
  const [mostMissed, setMostMissed] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'reviewed', 'unreviewed'

  useEffect(() => {
    loadData();
  }, [categoryId, filter]);

  const loadData = async () => {
    try {
      const [catResponse, statsResponse, missedResponse] = await Promise.all([
        categoryApi.getById(categoryId),
        notebookApi.getStats(categoryId),
        notebookApi.getMostMissed(categoryId, 5)
      ]);
      setCategory(catResponse.data.data);
      setStats(statsResponse.data.data);
      setMostMissed(missedResponse.data.data);

      // Load entries with filter
      const options = {};
      if (filter === 'reviewed') options.reviewed = true;
      if (filter === 'unreviewed') options.reviewed = false;

      const entriesResponse = await notebookApi.getByCategory(categoryId, options);
      setEntries(entriesResponse.data.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async (id) => {
    try {
      await notebookApi.markReviewed(id);
      loadData();
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await notebookApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notebook entries? This cannot be undone.')) {
      try {
        await notebookApi.clear(categoryId);
        loadData();
      } catch (error) {
        console.error('Error clearing notebook:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notebook - {category?.name}</h1>
          <p className="text-gray-600 mt-1">
            Track questions you got wrong for targeted review
          </p>
        </div>
        {entries.length > 0 && (
          <button onClick={handleClearAll} className="btn-danger text-sm">
            Clear All
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-3xl font-bold text-gray-900">{stats?.total_entries || 0}</div>
          <div className="text-sm text-gray-600">Total Entries</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-green-600">{stats?.reviewed_entries || 0}</div>
          <div className="text-sm text-gray-600">Reviewed</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-orange-600">{stats?.unreviewed_entries || 0}</div>
          <div className="text-sm text-gray-600">Need Review</div>
        </div>
      </div>

      {/* Most Missed Questions */}
      {mostMissed.length > 0 && (
        <div className="card mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Most Missed Questions</h2>
          </div>
          <div className="space-y-2">
            {mostMissed.map((item, index) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {item.question_text}
                  </p>
                </div>
                <span className="ml-4 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                  {item.times_missed}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          className="select w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Entries</option>
          <option value="unreviewed">Need Review</option>
          <option value="reviewed">Already Reviewed</option>
        </select>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">No entries yet</p>
          <p className="text-sm text-gray-500">
            Wrong answers from quizzes will appear here for review
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`card ${entry.reviewed ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 text-xs rounded ${
                  entry.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  entry.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {entry.difficulty}
                </span>
                <div className="flex space-x-2">
                  {!entry.reviewed && (
                    <button
                      onClick={() => handleMarkReviewed(entry.id)}
                      className="text-green-600 hover:text-green-700"
                      title="Mark as reviewed"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <p className="font-medium text-gray-900 mb-3">{entry.question_text}</p>

              <div className="space-y-2 text-sm">
                {entry.options.map((option, index) => {
                  const letter = option.charAt(0);
                  const isUserAnswer = entry.user_answer === letter;
                  const isCorrectAnswer = entry.correct_answer === letter;

                  return (
                    <div
                      key={index}
                      className={`p-2 rounded ${
                        isCorrectAnswer
                          ? 'bg-green-100 text-green-800'
                          : isUserAnswer
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {option}
                      {isCorrectAnswer && ' ✓'}
                      {isUserAnswer && !isCorrectAnswer && ' ✗'}
                    </div>
                  );
                })}
              </div>

              {entry.explanation && (
                <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
                  <strong>Explanation:</strong> {entry.explanation}
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">
                Added: {new Date(entry.created_at).toLocaleDateString()}
                {entry.reviewed && ' • Reviewed'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotebookPage;
