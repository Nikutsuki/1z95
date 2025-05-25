import { promises as fs } from 'fs';
import path from 'path';

// Simple in-memory broadcast mechanism
const subscribers: Array<() => void> = [];

export function subscribe(callback: () => void): () => void {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
}

function broadcast(): void {
  subscribers.forEach(callback => callback());
}

export interface Player {
  id: number;
  name: string;
  points: number;
  health: number;
  isActive: boolean;
}

export interface GameState {
  players: Player[];
  lastUpdated: string;
  gameTitle: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'gameState.json');

// Default game state with 10 players
const DEFAULT_GAME_STATE: GameState = {
  players: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    points: 0,
    health: 100,
    isActive: true,
  })),
  lastUpdated: new Date().toISOString(),
  gameTitle: '1z10',
};

export async function ensureDataDirectory(): Promise<void> {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function loadGameState(): Promise<GameState> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is corrupted, create default state
    await saveGameState(DEFAULT_GAME_STATE);
    return DEFAULT_GAME_STATE;
  }
}

export async function saveGameState(gameState: GameState): Promise<void> {
  await ensureDataDirectory();
  gameState.lastUpdated = new Date().toISOString();
  await fs.writeFile(DATA_FILE, JSON.stringify(gameState, null, 2), 'utf-8');
  broadcast(); // Notify all subscribers of the update
}

export async function updatePlayer(playerId: number, updates: Partial<Player>): Promise<GameState> {
  const gameState = await loadGameState();
  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) {
    throw new Error(`Player with ID ${playerId} not found`);
  }
  
  gameState.players[playerIndex] = {
    ...gameState.players[playerIndex],
    ...updates,
  };
  
  await saveGameState(gameState);
  return gameState;
}

export async function resetAllPlayers(): Promise<GameState> {
  const gameState = await loadGameState();
  gameState.players = gameState.players.map(player => ({
    ...player,
    points: 0,
    health: 100,
    isActive: true,
  }));
  
  await saveGameState(gameState);
  return gameState;
}