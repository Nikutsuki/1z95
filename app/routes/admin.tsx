import { json, type ActionFunction, type LoaderFunction, type MetaFunction, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { 
  loadGameState, 
  saveGameState, 
  updatePlayer, 
  resetAllPlayers, 
  type GameState
} from "~/lib/gameData";
import { SSEProvider, useSSE, ConnectionStatus } from "~/lib/websocket";
import { requireAuth, getSession, createAuthSession, commitSession, destroySession } from "~/lib/session";
import { validatePassword, isSessionExpired } from "~/lib/auth";

export const meta: MetaFunction = () => {
  return [
    { title: "1z10 Admin Panel" },
    { name: "description", content: "Admin panel for managing the 1z10 game. Edit player stats, points, health, and game settings." },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const session = await requireAuth(request);
  
  if (!session) {
    return json({ requiresAuth: true });
  }

  // Check if session is expired
  const loginTime = session.get("loginTime");
  if (loginTime && isSessionExpired(loginTime)) {
    return json({ requiresAuth: true });
  }

  const gameState = await loadGameState();
  return json({ gameState, requiresAuth: false });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  // Handle login action
  if (actionType === "login") {
    const password = formData.get("password") as string;
    
    if (!validatePassword(password)) {
      return json({ 
        success: false, 
        message: "Invalid password. Please try again." 
      }, { status: 401 });
    }

    const session = await createAuthSession(request);
    
    return redirect("/admin", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  // Handle logout action
  if (actionType === "logout") {
    const session = await getSession(request);
    
    return redirect("/admin", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  // Check authentication for all other actions
  const session = await requireAuth(request);
  if (!session) {
    return json({ success: false, message: "Authentication required" }, { status: 401 });
  }

  try {
    switch (actionType) {
      case "updatePlayer": {
        const playerId = parseInt(formData.get("playerId") as string);
        const name = formData.get("name") as string;
        const points = parseInt(formData.get("points") as string);
        const healthRaw = formData.get("health") as string;
        const health = parseInt(healthRaw);
        const isActive = formData.get("isActive") === "true";

        console.log("DEBUG updatePlayer:", {
          playerId,
          name,
          points,
          healthRaw,
          health,
          isActive
        });

        await updatePlayer(playerId, { name, points, health, isActive });
        return json({ success: true, message: "Player updated successfully" });
      }

      case "resetAll": {
        console.log("Processing resetAll action");
        const result = await resetAllPlayers();
        console.log("Reset completed:", result);
        return json({ success: true, message: "All players reset successfully" });
      }



      default:
        return json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json({ 
      success: false, 
      message: error instanceof Error ? error.message : "An error occurred" 
    }, { status: 500 });
  }
};

function LoginForm() {
  const actionData = useActionData<{ success: boolean; message: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Admin Login
          </h1>
          <p className="text-gray-300">
            Enter the admin password to access the game management panel
          </p>
        </div>

        {/* Error Message */}
        {actionData && !actionData.success && (
          <div className="mb-6 p-4 rounded-lg bg-red-800/50 border border-red-600 text-red-200">
            {actionData.message}
          </div>
        )}

        {/* Login Form */}
        <Form method="post" className="space-y-6">
          <input type="hidden" name="actionType" value="login" />
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Admin Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter admin password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
          >
            {isSubmitting ? "Authenticating..." : "Login"}
          </button>
        </Form>

        {/* Back to Game Link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors duration-300"
          >
            ← Back to Game View
          </a>
        </div>
      </div>
    </div>
  );
}

function AdminPanel() {
  const initialGameState = useLoaderData<{ gameState: GameState }>();
  const { gameState: liveGameState } = useSSE();
  const actionData = useActionData<{ success: boolean; message: string }>();
  const navigation = useNavigation();
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Use live game state if available, otherwise fallback to initial state
  const gameState = liveGameState || initialGameState.gameState;
  const isSubmitting = navigation.state === "submitting";

  // Close editing mode when form is submitted successfully
  useEffect(() => {
    if (actionData?.success && !isSubmitting) {
      setEditingPlayer(null);
      setShowResetConfirm(false);
    }
  }, [actionData, isSubmitting]);

  const renderHealthSquares = (health: number) => {
    // Convert percentage to 0-3 health points
    const healthPoints = Math.round((health / 100) * 3);
    
    return (
      <div className="flex justify-center gap-1">
        {[1, 2, 3].map((point) => (
          <div
            key={point}
            className={`w-4 h-4 rounded-sm border transition-all duration-300 ${
              point <= healthPoints
                ? "bg-green-500 border-green-400"
                : "bg-red-500 border-red-400"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="Game Logo" 
            className="mx-auto mb-4 h-40 md:h-48 lg:h-56 w-auto drop-shadow-2xl"
          />
          <h2 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Admin Panel
          </h2>
          <p className="text-xl text-gray-300 mb-4">
            Manage Game State
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300"
            >
              ← Back to Game View
            </a>
            <Form method="post" className="inline-block">
              <input type="hidden" name="actionType" value="logout" />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300"
              >
                Logout
              </button>
            </Form>
          </div>
        </div>

        {/* Action Feedback */}
        {actionData && (
          <div className={`mb-6 p-4 rounded-lg ${
            actionData.success 
              ? "bg-green-800/50 border border-green-600 text-green-200" 
              : "bg-red-800/50 border border-red-600 text-red-200"
          }`}>
            {actionData.message}
          </div>
        )}

        {/* Game Settings */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8 border border-gray-700">
          <h3 className="text-2xl font-bold mb-6 text-purple-300">Game Settings</h3>

          <div className="flex gap-4">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
            >
              Reset All Players
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md">
              <h3 className="text-xl font-bold mb-4 text-red-400">Confirm Reset</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to reset all players? This will set all players to 0 points, 100% health, and active status.
              </p>
              <div className="flex gap-4">
                <Form method="post" className="flex-1" onSubmit={() => console.log("Reset form submitted")}>
                  <input type="hidden" name="actionType" value="resetAll" />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
                  >
                    {isSubmitting ? "Resetting..." : "Yes, Reset All"}
                  </button>
                </Form>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Players Management */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-purple-400">Players Management</h2>
          
          <div className="grid gap-4">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`border rounded-lg p-4 transition-all duration-300 ${
                  player.isActive 
                    ? "border-gray-600 bg-gray-700/50" 
                    : "border-red-800 bg-red-900/20"
                }`}
              >
                {editingPlayer === player.id ? (
                  <Form method="post" className="space-y-4">
                    <input type="hidden" name="actionType" value="updatePlayer" />
                    <input type="hidden" name="playerId" value={player.id} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor={`name-${player.id}`} className="block text-sm font-medium text-gray-300 mb-1">
                          Name
                        </label>
                        <input
                          id={`name-${player.id}`}
                          type="text"
                          name="name"
                          defaultValue={player.name}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor={`points-${player.id}`} className="block text-sm font-medium text-gray-300 mb-1">
                          Points
                        </label>
                        <input
                          id={`points-${player.id}`}
                          type="number"
                          name="points"
                          defaultValue={player.points}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor={`health-${player.id}`} className="block text-sm font-medium text-gray-300 mb-1">
                          Health (0-3)
                        </label>
                        <select
                          id={`health-${player.id}`}
                          name="health"
                          defaultValue={player.health}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-purple-500"
                          required
                        >
                          <option value="0">0 (Dead)</option>
                          <option value="33">1 (Low)</option>
                          <option value="67">2 (Medium)</option>
                          <option value="100">3 (Full)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor={`status-${player.id}`} className="block text-sm font-medium text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          id={`status-${player.id}`}
                          name="isActive"
                          defaultValue={player.isActive.toString()}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="true">Active</option>
                          <option value="false">Eliminated</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPlayer(null)}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </Form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="text-lg font-bold text-blue-300">
                        #{player.id}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {player.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {player.isActive ? "Active" : "Eliminated"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-yellow-400">
                          {player.points}
                        </div>
                        <div className="text-xs text-gray-400">Points</div>
                      </div>
                      <div className="text-center">
                        {renderHealthSquares(player.health)}
                        <div className="text-xs text-gray-400 mt-1">Health</div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setEditingPlayer(player.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          Last updated: {new Date(gameState.lastUpdated).toLocaleString()}
        </div>

        {/* Connection Status */}
        <ConnectionStatus />
      </div>
    </div>
  );
}

export default function Admin() {
  const data = useLoaderData<{ gameState?: GameState; requiresAuth: boolean }>();
  
  if (data.requiresAuth) {
    return <LoginForm />;
  }
  
  return (
    <SSEProvider initialGameState={data.gameState!}>
      <AdminPanel />
    </SSEProvider>
  );
}