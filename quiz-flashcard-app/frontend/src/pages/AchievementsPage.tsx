import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Star,
  Award,
  Crown,
  Flame,
  Zap,
  Target,
  BookOpen,
  GraduationCap,
  Layers,
  TrendingUp,
  Medal,
  Sparkles,
  HelpCircle,
  BadgeCheck,
  ExternalLink,
  Shield,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { achievementsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { AchievementWithProgress, AchievementCategory, AchievementRarity } from '../types';

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  Award,
  Trophy,
  Crown,
  Flame,
  Zap,
  Target,
  BookOpen,
  GraduationCap,
  Layers,
  TrendingUp,
  Medal,
  Sparkles,
  HelpCircle,
  BadgeCheck,
};

// Rarity colors and styles
const rarityStyles: Record<AchievementRarity, { border: string; bg: string; text: string; glow: string }> = {
  common: {
    border: 'border-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    glow: '',
  },
  rare: {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  epic: {
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-500/30',
  },
  legendary: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-600 dark:text-yellow-400',
    glow: 'shadow-yellow-500/40 ring-2 ring-yellow-300/50',
  },
};

// Category labels
const categoryLabels: Record<AchievementCategory, string> = {
  accuracy: 'Accuracy',
  streak: 'Streak',
  volume: 'Volume',
  mastery: 'Mastery',
};

interface AchievementBadgeProps {
  data: AchievementWithProgress;
  onClick: () => void;
}

function AchievementBadge({ data, onClick }: AchievementBadgeProps): React.ReactElement {
  const { achievement, is_unlocked, progress, progress_text, verification_status } = data;
  const Icon = iconMap[achievement.icon_name] || Trophy;
  const rarity = rarityStyles[achievement.rarity];

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200
        ${is_unlocked
          ? `${rarity.border} ${rarity.bg} ${rarity.glow} hover:scale-105 shadow-lg`
          : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 hover:opacity-80'
        }
      `}
    >
      {/* Verified badge - pointer-events-none so clicks pass through to parent button */}
      {is_unlocked && verification_status === 'verified' && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 pointer-events-none">
          <Shield className="h-3 w-3" />
        </div>
      )}

      {/* Lock icon for locked achievements - pointer-events-none so clicks pass through */}
      {!is_unlocked && (
        <div className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full p-1 pointer-events-none">
          <Lock className="h-3 w-3" />
        </div>
      )}

      {/* Icon */}
      <div className="flex justify-center mb-3">
        <div
          className={`
            p-3 rounded-full
            ${is_unlocked ? 'bg-white dark:bg-gray-900' : 'bg-gray-200 dark:bg-gray-700'}
          `}
        >
          <Icon
            className={`h-8 w-8 ${is_unlocked ? '' : 'text-gray-400'}`}
            style={{ color: is_unlocked ? achievement.icon_color : undefined }}
          />
        </div>
      </div>

      {/* Name */}
      <h3 className={`font-semibold text-center mb-1 ${is_unlocked ? '' : 'text-gray-500 dark:text-gray-400'}`}>
        {achievement.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2 line-clamp-2">
        {achievement.description}
      </p>

      {/* Points */}
      <div className={`text-center text-sm font-medium ${rarity.text}`}>
        {achievement.points} pts
      </div>

      {/* Progress bar for locked achievements */}
      {!is_unlocked && progress !== undefined && progress !== null && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {progress_text && (
            <p className="text-xs text-gray-400 text-center mt-1">{progress_text}</p>
          )}
        </div>
      )}

      {/* Rarity badge */}
      <div className={`mt-2 text-xs text-center capitalize ${rarity.text}`}>
        {achievement.rarity}
      </div>
    </button>
  );
}

function AchievementsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [totalPoints, setTotalPoints] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await achievementsApi.getUserAchievements();
      const data = response.data.data || response.data;
      setAchievements(data.achievements || []);
      setTotalPoints(data.total_points || 0);
      setUnlockedCount(data.unlocked_count || 0);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      console.error('Failed to load achievements:', err);
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.achievement.category === selectedCategory);

  const categories: (AchievementCategory | 'all')[] = ['all', 'accuracy', 'streak', 'volume', 'mastery'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Achievements</h1>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalPoints}</div>
                <div className="text-xs text-gray-500">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {unlockedCount}/{totalCount}
                </div>
                <div className="text-xs text-gray-500">Unlocked</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {cat === 'all' ? 'All' : categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Login prompt for guests */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center space-x-3">
            <Lock className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-700 dark:text-yellow-300">
              Sign in to track your achievement progress!
            </p>
          </div>
        )}

        {/* Blockchain info */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-indigo-900 dark:text-indigo-200">Blockchain Verified Achievements</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                Your achievements are stored on IPFS and anchored to Base L2 blockchain for permanent, verifiable proof of your learning accomplishments.
              </p>
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAchievements.map((achievement) => (
            <AchievementBadge
              key={achievement.achievement.id}
              data={achievement}
              onClick={() => setSelectedAchievement(achievement)}
            />
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No achievements in this category yet.
          </div>
        )}
      </main>

      {/* Achievement Modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAchievement(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <AchievementModal
              data={selectedAchievement}
              onClose={() => setSelectedAchievement(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface AchievementModalProps {
  data: AchievementWithProgress;
  onClose: () => void;
}

function AchievementModal({ data, onClose }: AchievementModalProps): React.ReactElement {
  const { achievement, is_unlocked, earned_at, progress, progress_text, verification_status, ipfs_url, tx_hash } = data;
  const Icon = iconMap[achievement.icon_name] || Trophy;
  const rarity = rarityStyles[achievement.rarity];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${rarity.bg} ${rarity.text}`}>
          {achievement.rarity}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          &times;
        </button>
      </div>

      {/* Icon and name */}
      <div className="text-center mb-4">
        <div
          className={`
            inline-flex p-4 rounded-full mb-3
            ${is_unlocked ? rarity.bg : 'bg-gray-100 dark:bg-gray-700'}
          `}
        >
          <Icon
            className="h-12 w-12"
            style={{ color: is_unlocked ? achievement.icon_color : '#9CA3AF' }}
          />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{achievement.name}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{achievement.description}</p>
      </div>

      {/* Status */}
      <div className="mb-4">
        {is_unlocked ? (
          <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Unlocked!</span>
            {earned_at && (
              <span className="text-gray-400 text-sm">
                {new Date(earned_at).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(progress || 0, 100)}%` }}
              />
            </div>
            {progress_text && (
              <p className="text-center text-sm text-gray-500">{progress_text}</p>
            )}
          </div>
        )}
      </div>

      {/* Points */}
      <div className="text-center mb-4">
        <span className={`text-2xl font-bold ${rarity.text}`}>{achievement.points}</span>
        <span className="text-gray-500 ml-1">points</span>
      </div>

      {/* Blockchain verification */}
      {is_unlocked && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Blockchain Verification
          </h3>

          <div className="space-y-2 text-sm">
            {verification_status === 'verified' ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                Verified on Base L2
              </div>
            ) : verification_status === 'pending' ? (
              <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full mr-2" />
                Verification pending...
              </div>
            ) : null}

            {ipfs_url && (
              <a
                href={ipfs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Certificate on IPFS
              </a>
            )}

            {tx_hash && (
              <a
                href={`https://basescan.org/tx/${tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on BaseScan
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AchievementsPage;
