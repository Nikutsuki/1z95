import { type LoaderFunction } from "@remix-run/node";
import { loadGameState, subscribe } from "~/lib/gameData";

export const loader: LoaderFunction = async ({ request }) => {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: unknown, event = "message") => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        const checkForUpdates = async () => {
          try {
            const gameState = await loadGameState();
            sendEvent(gameState, "gameStateUpdate");
          } catch (error) {
            sendEvent({ error: "Failed to load game state" }, "error");
          }
        };

        // Send initial data
        checkForUpdates();

        // Subscribe to real-time updates
        const unsubscribe = subscribe(() => {
          checkForUpdates();
        });

        // Keep connection alive
        const heartbeat = setInterval(() => {
          sendEvent({ timestamp: new Date().toISOString() }, "heartbeat");
        }, 30000);

        // Cleanup function
        const cleanup = () => {
          unsubscribe();
          clearInterval(heartbeat);
          controller.close();
        };

        // Handle client disconnect
        request.signal.addEventListener("abort", cleanup);

        // Auto-cleanup after 5 minutes
        setTimeout(cleanup, 300000);
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    }
  );
};