import { type LoaderFunction } from "@remix-run/node";
import { loadGameState, subscribe } from "~/lib/gameData";

export const loader: LoaderFunction = async ({ request }) => {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let isClosed = false;
        
        const sendEvent = (data: unknown, event = "message") => {
          if (isClosed) return;
          try {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            // Connection was likely closed, mark as closed
            isClosed = true;
          }
        };

        const checkForUpdates = async () => {
          if (isClosed) return;
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
          if (!isClosed) {
            sendEvent({ timestamp: new Date().toISOString() }, "heartbeat");
          }
        }, 30000);

        // Cleanup function
        const cleanup = () => {
          if (isClosed) return;
          isClosed = true;
          unsubscribe();
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch (error) {
            // Controller already closed, ignore
          }
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