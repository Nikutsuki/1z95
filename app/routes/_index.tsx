import { json, type LoaderFunction, type MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { loadGameState, type GameState } from "~/lib/gameData";
import { SSEProvider, useSSE, ConnectionStatus } from "~/lib/websocket";

export const meta: MetaFunction = () => {
  return [
    { title: "1z10 Game Dashboard" },
    {
      name: "description",
      content:
        "Real-time player status dashboard for the 1z10 game. Track points, health, and player activity.",
    },
  ];
};

export const loader: LoaderFunction = async () => {
  const gameState = await loadGameState();
  return json(gameState);
};

function GameDashboard() {
  const initialGameState = useLoaderData<GameState>();
  const { gameState: liveGameState } = useSSE();

  // Use live game state if available, otherwise fallback to initial state
  const gameState = liveGameState || initialGameState;

  const renderHealthSquares = (health: number) => {
    // Convert percentage to 0-3 health points
    const healthPoints = Math.round((health / 100) * 3);
    
    return (
      <div className="flex justify-center gap-2 mb-2">
        {[1, 2, 3].map((point) => (
          <div
            key={point}
            className={`w-6 h-6 rounded-sm border-2 transition-all duration-300 ${
              point <= healthPoints
                ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/50"
                : "bg-red-500 border-red-400 shadow-lg shadow-red-500/50"
            }`}
          />
        ))}
      </div>
    );
  };

  const activePlayers = gameState.players.filter((player) => player.isActive);
  const inactivePlayers = gameState.players.filter(
    (player) => !player.isActive,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-7xl md:text-8xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 drop-shadow-2xl">
            {gameState.gameTitle}
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-600 mx-auto rounded-full"></div>
        </div>

        {/* Active Players */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-green-400 drop-shadow-lg">
              Active Players
            </h2>
            <div className="inline-flex items-center justify-center px-6 py-2 bg-green-500/20 border-2 border-green-500/50 rounded-full">
              <span className="text-2xl font-semibold text-green-300">{activePlayers.length}</span>
              <span className="ml-2 text-lg text-green-400">online</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 justify-items-center">
            {activePlayers.map((player) => (
              <div
                key={player.id}
                className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-md rounded-2xl p-6 border border-gray-600/50 hover:border-blue-400/70 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 w-full max-w-[350px]"
              >
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-4 text-blue-300 tracking-wide">
                      {player.name}
                    </h3>

                    {/* Points */}
                    <div className="mb-6">
                      <div className="text-4xl font-extrabold text-yellow-400 mb-2 drop-shadow-lg">
                        {player.points}
                      </div>
                      <div className="text-sm text-gray-400 uppercase tracking-wider">Points</div>
                    </div>

                    {/* Health */}
                    <div className="mb-4">
                      {renderHealthSquares(player.health)}
                      <div className="text-xs text-gray-400 uppercase tracking-wider">Health</div>
                    </div>
                  </div>
                </div>
            ))}
        </div>
        </div>

        {/* Inactive Players */}
        {inactivePlayers.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4 text-red-400 drop-shadow-lg">
                Eliminated Players
              </h2>
              <div className="inline-flex items-center justify-center px-6 py-2 bg-red-500/20 border-2 border-red-500/50 rounded-full">
                <span className="text-xl font-semibold text-red-300">{inactivePlayers.length}</span>
                <span className="ml-2 text-lg text-red-400">eliminated</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 justify-items-center">
              {inactivePlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-4 border border-red-800/50 opacity-70 hover:opacity-90 transition-all duration-300 w-full max-w-[250px]"
                >
                    <div className="text-center">
                      <h3 className="text-lg font-bold mb-2 text-red-300">
                        {player.name}
                      </h3>
                      <div className="text-sm text-gray-500 mb-2 uppercase tracking-wide">Eliminated</div>
                      <div className="text-xl font-semibold text-yellow-600">
                        {player.points} pts
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Index() {
  const gameState = useLoaderData<GameState>();

  return (
    <SSEProvider initialGameState={gameState}>
      <GameDashboard />
    </SSEProvider>
  );
}
