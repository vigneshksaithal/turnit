import type {
  ApiResponse,
  ApiSuccess,
  ClientPuzzleData,
  CreatePuzzleResponse,
  GameSession,
  GuessResult,
  LeaderboardEntry,
  UserStats
} from '../../shared/types'

// ─── Typed Fetch Wrapper ─────────────────────────────────────────────────────

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })

  const data: unknown = await response.json()
  const result = data as ApiResponse<T>

  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return (result as ApiSuccess<T>).data
}

// ─── Puzzle ──────────────────────────────────────────────────────────────────

export type PuzzleLoadResult = {
  puzzle: ClientPuzzleData
  session: GameSession | null
  isCreator: boolean
}

export const loadPuzzle = async (): Promise<PuzzleLoadResult> => {
  return await fetchJson<PuzzleLoadResult>('/api/puzzle')
}

// ─── Guess ───────────────────────────────────────────────────────────────────

export const submitGuess = async (guess: string): Promise<GuessResult> => {
  return await fetchJson<GuessResult>('/api/guess', {
    method: 'POST',
    body: JSON.stringify({ guess })
  })
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export type StatsResult = {
  stats: UserStats
  difficulty: string
}

export const loadStats = async (): Promise<StatsResult> => {
  return await fetchJson<StatsResult>('/api/stats')
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type PostLeaderboardResult = {
  entries: LeaderboardEntry[]
  totalSolvers: number
}

export const loadPostLeaderboard = async (): Promise<PostLeaderboardResult> => {
  return await fetchJson<PostLeaderboardResult>('/api/leaderboard/post')
}

export type GlobalLeaderboardResult = {
  entries: LeaderboardEntry[]
}

export const loadGlobalLeaderboard = async (): Promise<GlobalLeaderboardResult> => {
  return await fetchJson<GlobalLeaderboardResult>('/api/leaderboard/global')
}

// ─── Create Puzzle ───────────────────────────────────────────────────────────

export const createPuzzle = async (word: string): Promise<CreatePuzzleResponse> => {
  return await fetchJson<CreatePuzzleResponse>('/api/create', {
    method: 'POST',
    body: JSON.stringify({ word })
  })
}

// ─── Validate Word ───────────────────────────────────────────────────────────

export const validateWord = async (word: string): Promise<boolean> => {
  const result = await fetchJson<{ valid: boolean }>('/api/validate-word', {
    method: 'POST',
    body: JSON.stringify({ word })
  })
  return result.valid
}
