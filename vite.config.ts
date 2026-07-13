import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Встраивает MCP-сервер шахмат (Express-приложение) в процесс Vite dev-сервера,
 * чтобы UI и агенты играли одну партию через http://localhost:5173/mcp.
 *
 * Реестр партий (Map в engineApi.ts) живёт в этом же процессе, поэтому
 * браузер, ZCode и другие агенты видят общий gameId. Real-time-обновления
 * доски идут через GET /events (SSE). Отдельный http-процесс не нужен.
 *
 * ssrLoadModule даёт транспиляцию TS и алиас @/engine.
 */
function chessMcpPlugin(): Plugin {
  return {
    name: "chess-mcp",
    configureServer(server) {
      // Регистрируем mount-обработчик СИНХРОННО, чтобы он встал в начало
      // стека middlewares — до Vite-овского SPA-fallback (который Vite
      // добавляет в самом конце и который иначе перехватил бы /health, /mcp).
      // Само Express-приложение подменяется сюда асинхронно после ssrLoadModule.
      let mcpApp: import("express").Express | null = null;
      server.middlewares.use((req, res, next) => {
        if (mcpApp) {
          // Делегируем запрос Express-приложению. Оно само вызовет next()
          // для маршрутов, которые не знает (Vite тогда отдаст UI).
          mcpApp(req as never, res as never, next as never);
        } else {
          next();
        }
      });

      // Асинхронно подгружаем MCP-модуль. ssrLoadModule даёт транспиляцию
      // TS и алиас @/engine. Как только готово — подставляем app.
      server.ssrLoadModule("/src/mcp/httpServer.ts").then(
        ({ buildMcpExpressApp }) => {
          mcpApp = buildMcpExpressApp("localhost");
          console.error(
            "[chess-mcp] MCP встроен в Vite: http://localhost:5173/mcp",
          );
          console.error(
            "[chess-mcp] Real-time доска: http://localhost:5173/events",
          );
        },
        (err) => {
          console.error("[chess-mcp] Не удалось загрузить MCP-модуль:", err);
        },
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), chessMcpPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
