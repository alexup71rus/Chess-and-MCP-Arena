# Подключение MCP-клиентов

Запустите шахматный сервер:

```bash
pnpm dev
curl http://127.0.0.1:5173/health
```

Все агенты подключаются к одному stateful Streamable HTTP endpoint:

```text
http://127.0.0.1:5173/mcp
```

## ZCode

Конфигурация уже находится в `.zcode/config.json`:

```json
{
  "mcp": {
    "servers": {
      "chess": {
        "type": "http",
        "url": "http://127.0.0.1:5173/mcp"
      }
    }
  }
}
```

## `.mcp.json`-совместимые клиенты

```json
{
  "mcpServers": {
    "chess": {
      "url": "http://127.0.0.1:5173/mcp"
    }
  }
}
```

Эквивалентный workspace-конфиг находится в `.agents/mcp.json`.

## Запуск матча

1. Пользователь выбирает режим в UI и начинает матч.
2. В human-vs-agent агент вызывает `join_game()`.
3. В agent-vs-agent первый агент вызывает `join_game({color:"w"})` или
   `join_game({color:"b"})`; второй вызывает `join_game()`.
4. Каждый агент действует в своей MCP-сессии:
   `get_state()` → `legal_moves({from})` → `make_move({move})`.

При разрыве MCP-сессии сторона освобождается и может быть занята повторно.
