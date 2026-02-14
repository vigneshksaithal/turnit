// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_ATTEMPTS = 6
export const MIN_WORD_LENGTH = 3
export const MAX_WORD_LENGTH = 6

export const DIFFICULTY_THRESHOLDS = {
  EASY_MAX_STREAK: 2,
  MEDIUM_MAX_STREAK: 5
} as const

export const LETTERS_PER_RING = {
  easy: 6,
  medium: 8,
  hard: 10
} as const

export const FIXED_LETTERS_COUNT = {
  easy: 2,
  medium: 1,
  hard: 0
} as const

// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard'

export type LetterFeedback = 'correct' | 'present' | 'absent'

export type GameStatus = 'playing' | 'solved' | 'failed'

export type AchievementId =
  | 'first_crack'
  | 'locksmith'
  | 'lock_master'
  | 'hot_streak'
  | 'unbreakable'
  | 'speed_demon'

// ─── Core Game Types ─────────────────────────────────────────────────────────

/** A single ring on the combination lock */
export type RingConfig = {
  /** All letters available on this ring */
  letters: string[]
  /** Index of the correct letter within `letters` */
  correctIndex: number
  /** Whether this ring is fixed (gold, non-scrollable) */
  isFixed: boolean
}

/** Full puzzle configuration stored server-side in Redis */
export type PuzzleConfig = {
  /** The answer word (NEVER sent to client) */
  answer: string
  /** Number of letters in the word */
  wordLength: number
  /** Ring configurations */
  rings: RingConfig[]
  /** Difficulty level */
  difficulty: Difficulty
  /** Indices of fixed (revealed) rings */
  fixedIndices: number[]
}

/** Data stored in postData (sent to client, max 2KB, NO secrets) */
export type PostData = {
  wordLength: number
  creatorName: string
  createdAt: string
  isDaily: boolean
}

/** What the client receives when loading a puzzle */
export type ClientPuzzleData = {
  wordLength: number
  rings: ClientRingData[]
  fixedIndices: number[]
  difficulty: Difficulty
  creatorName: string
  isDaily: boolean
}

/** Ring data safe for the client (correct letter only revealed for fixed rings) */
export type ClientRingData = {
  letters: string[]
  isFixed: boolean
  /** Only set for fixed rings */
  fixedLetter?: string | undefined
}

// ─── Guess & Feedback ────────────────────────────────────────────────────────

export type GuessResult = {
  feedback: LetterFeedback[]
  isCorrect: boolean
  attemptsUsed: number
  attemptsRemaining: number
  gameStatus: GameStatus
  /** Only present when game is over (solved) */
  answer?: string | undefined
}

// ─── User & Stats ────────────────────────────────────────────────────────────

export type UserStats = {
  totalSolved: number
  totalPlayed: number
  currentStreak: number
  bestStreak: number
  /** ISO date string of last solve */
  lastSolveDate: string
  /** Distribution of attempts taken: index 0 = solved in 1, etc. */
  attemptDistribution: number[]
  achievements: AchievementId[]
}

export const DEFAULT_USER_STATS: UserStats = {
  totalSolved: 0,
  totalPlayed: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSolveDate: '',
  attemptDistribution: [0, 0, 0, 0, 0, 0],
  achievements: []
}

export type Achievement = {
  id: AchievementId
  name: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_crack', name: 'First Crack', description: 'Solve your first puzzle', icon: 'unlock' },
  { id: 'locksmith', name: 'Locksmith', description: 'Solve 25 puzzles', icon: 'key' },
  { id: 'lock_master', name: 'Lock Master', description: 'Solve 50 puzzles', icon: 'crown' },
  { id: 'hot_streak', name: 'Hot Streak', description: '5-day solve streak', icon: 'flame' },
  { id: 'unbreakable', name: 'Unbreakable', description: '10-day solve streak', icon: 'shield' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Solve on the first attempt', icon: 'zap' }
] as const

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  username: string
  score: number
  rank: number
}

// ─── Game Session (per user per post, stored in Redis) ───────────────────────

export type GameSession = {
  postId: string
  userId: string
  attemptsUsed: number
  status: GameStatus
  /** Each guess as a string */
  guesses: string[]
  /** Feedback for each guess */
  feedbacks: LetterFeedback[][]
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export type ApiSuccess<T> = {
  status: 'success'
  data: T
}

export type ApiError = {
  status: 'error'
  message: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Create Puzzle ───────────────────────────────────────────────────────────

export type CreatePuzzleRequest = {
  word: string
}

export type CreatePuzzleResponse = {
  navigateTo: string
}
