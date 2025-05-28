import { json, type LoaderFunction, type MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { loadGameState, type GameState } from "~/lib/gameData";
import { SSEProvider, useSSE } from "~/lib/websocket";

export const meta: MetaFunction = () => {
  return [
    { title: "1z10 Tablica Gry" },
    {
      name: "description",
      content:
        "Tablica statusu graczy w czasie rzeczywistym dla gry 1z10. Śledź punkty, zdrowie i aktywność graczy.",
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
            className={`w-6 h-6 rounded-sm border-2 ${
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

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-neutral-900 text-white overflow-hidden">
      <div className="container mx-auto px-4 max-w-full h-full flex flex-col">
        {/* Header */}
        <div className="text-center py-12">
          <img
            src="/logo.png"
            alt="Game Logo"
            className="mx-auto -mb-12 h-40 md:h-52 lg:h-64 w-auto drop-shadow-2xl"
          />
        </div>

        {/* Active Players */}
        <div className="flex-1 px-2 -mt-8 pb-2 overflow-auto flex items-center justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 justify-items-center place-content-center">
            {activePlayers.map((player) => (
              <div
                key={player.id}
                className="backdrop-blur-md rounded-2xl p-10 w-full max-w-[580px] transition-all duration-1000 ease-in-out"
                style={{
                  background:
                    player.health === 0
                      ? "linear-gradient(to bottom right, rgba(3, 7, 18, 0.9), rgba(0, 0, 0, 0.9))"
                      : "linear-gradient(to bottom right, rgba(31, 41, 55, 0.6), rgba(17, 24, 39, 0.6))",
                  borderColor:
                    player.health === 0
                      ? "rgba(17, 24, 39, 0.8)"
                      : "rgba(75, 85, 99, 0.5)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  opacity: player.health === 0 ? 0.6 : 1,
                  transform: player.health === 0 ? "scale(0.95)" : "scale(1)",
                }}
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4 text-blue-300 tracking-wide">
                    {player.name}
                  </h3>

                  {/* Points */}
                  <div className="mb-6">
                    <div className="text-4xl font-extrabold text-white mb-3 drop-shadow-lg">
                      {player.points}
                    </div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">
                      Punkty
                    </div>
                  </div>

                  {/* Health */}
                  <div className="mb-4">
                    {renderHealthSquares(player.health)}
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      Zdrowie
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
