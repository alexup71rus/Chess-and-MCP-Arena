import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Color, GameStatus, PieceType } from "@/engine";

export type Locale = "ru" | "en" | "zh-CN";

type Messages = {
  language: string;
  soundOn: string;
  soundOff: string;
  settings: string;
  effects: string;
  noEffects: string;
  classicEffects: string;
  overdriveEffects: string;
  showMoveHints: string;
  showTimer: string;
  gameTime: string;
  localeName: string;
  title: string;
  chooseMode: string;
  localSubtitle: string;
  localMode: string;
  localDescription: string;
  humanVsAlgorithm: string;
  humanVsAlgorithmDescription: string;
  humanVsAgent: string;
  humanVsAgentDescription: string;
  agentVsAgent: string;
  agentVsAgentDescription: string;
  spectating: string;
  yourColor: string;
  difficulty: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  startLocal: string;
  startAlgorithmMatch: string;
  startMatch: string;
  startAgentMatch: string;
  creating: string;
  humanHint: string;
  algorithmHint: string;
  agentHint: string;
  newGame: string;
  exitToMenu: string;
  gameLabel: string;
  controlsLabel: string;
  connectionsLabel: string;
  flipBoard: string;
  resetBoard: string;
  undo: string;
  playerHuman: string;
  playerAlgorithm: string;
  playerAgent: string;
  algorithmThinking: string;
  noConnection: string;
  connected: string;
  waiting: string;
  sendingMove: string;
  connectionLost: string;
  history: string;
  gameNotStarted: string;
  choosePromotion: string;
  cancel: string;
  newGameTitle: string;
  exitTitle: string;
  resetLocalDescription: string;
  resetOnlineDescription: string;
  exitLocalDescription: string;
  exitOnlineDescription: string;
  restart: string;
  exit: string;
  back: string;
  connecting: string;
  white: string;
  black: string;
  turn: (color: string) => string;
  check: (color: string) => string;
  checkmate: (color: string) => string;
  resigned: (color: string) => string;
  stalemate: string;
  draw: (reason: string) => string;
  fiftyMove: string;
  threefold: string;
  insufficientMaterial: string;
};

const messages: Record<Locale, Messages> = {
  ru: {
    language: "Язык",
    soundOn: "Звук включён",
    soundOff: "Звук выключен",
    settings: "Настройки",
    effects: "Эффекты",
    noEffects: "Без эффектов",
    classicEffects: "Классика",
    overdriveEffects: "Overdrive",
    showMoveHints: "Показывать доступные ходы",
    showTimer: "Показывать таймер",
    gameTime: "Время партии",
    localeName: "Русский",
    title: "♛ Шахматы",
    chooseMode: "Выберите режим игры",
    localSubtitle: "Классическая партия — горячие места",
    localMode: "Локально",
    localDescription: "Два человека за одним экраном. Без сервера и агентов.",
    humanVsAlgorithm: "Человек против алгоритма",
    humanVsAlgorithmDescription:
      "Локальный шахматный бот без нейросетей и MCP.",
    humanVsAgent: "Человек против агента",
    humanVsAgentDescription:
      "Ты ходишь на доске, агент подключается через MCP.",
    agentVsAgent: "Агент против агента",
    agentVsAgentDescription: "Два MCP-агента играют, ты наблюдаешь.",
    spectating: "наблюдение",
    yourColor: "Твой цвет:",
    difficulty: "Сложность:",
    difficultyEasy: "Лёгкая (1 полуход)",
    difficultyMedium: "Средняя (3 полухода)",
    difficultyHard: "Сложная (до 5 полуходов)",
    startLocal: "Начать локальную партию",
    startAlgorithmMatch: "Играть с алгоритмом",
    startMatch: "Начать матч",
    startAgentMatch: "Начать матч для агентов",
    creating: "Создаём…",
    humanHint:
      "После старта попроси агента вызвать join_game. Свободная сторона определится автоматически.",
    algorithmHint:
      "Алгоритм работает в браузере: negamax с alpha-beta отсечениями, без нейросетей.",
    agentHint:
      "Первый агент вызывает join_game с выбранным цветом, второй получает оставшуюся сторону.",
    newGame: "Новая партия",
    exitToMenu: "Выйти в главное меню",
    gameLabel: "Шахматная партия",
    controlsLabel: "Управление партией",
    connectionsLabel: "Подключения агентов",
    flipBoard: "Доска",
    resetBoard: "Вернуть обычный вид доски",
    undo: "Отменить ход",
    playerHuman: "Человек",
    playerAlgorithm: "Алгоритм",
    playerAgent: "Агент",
    algorithmThinking: "Алгоритм выбирает ход…",
    noConnection: "Нет связи",
    connected: "Подключён",
    waiting: "Ожидается",
    sendingMove: "Отправка хода…",
    connectionLost: "Соединение с шахматным сервером потеряно",
    history: "Ходы партии",
    gameNotStarted: "Партия ещё не началась",
    choosePromotion: "Выберите фигуру",
    cancel: "Отмена",
    newGameTitle: "Начать новую партию?",
    exitTitle: "Выйти в меню?",
    resetLocalDescription: "Текущий прогресс партии будет сброшен.",
    resetOnlineDescription: "Текущая онлайн-партия будет заменена новой.",
    exitLocalDescription: "Текущая партия будет закрыта.",
    exitOnlineDescription:
      "Текущая онлайн-партия будет закрыта для этого клиента.",
    restart: "Начать заново",
    exit: "Выйти",
    back: "Назад",
    connecting: "Подключение к активной партии…",
    white: "Белые",
    black: "Чёрные",
    turn: (color) => `Ход за ${color}`,
    check: (color) => `Шах — ход за ${color}`,
    checkmate: (color) => `Мат! Победили ${color}`,
    resigned: (color) => `Сдача. Победили ${color}`,
    stalemate: "Пат — ничья",
    draw: (reason) => `Ничья (${reason})`,
    fiftyMove: "правило 50 ходов",
    threefold: "троекратное повторение",
    insufficientMaterial: "недостаточный материал",
  },
  en: {
    language: "Language",
    soundOn: "Sound on",
    soundOff: "Sound off",
    settings: "Settings",
    effects: "Effects",
    noEffects: "No effects",
    classicEffects: "Classic",
    overdriveEffects: "Overdrive",
    showMoveHints: "Show legal moves",
    showTimer: "Show timer",
    gameTime: "Game time",
    localeName: "English",
    title: "♛ Chess",
    chooseMode: "Choose a game mode",
    localSubtitle: "Classic game — hot seat",
    localMode: "Local game",
    localDescription: "Two people on one screen. No server or agents needed.",
    humanVsAlgorithm: "Human vs algorithm",
    humanVsAlgorithmDescription:
      "A local chess bot without neural networks or MCP.",
    humanVsAgent: "Human vs agent",
    humanVsAgentDescription:
      "You move on the board; the agent connects through MCP.",
    agentVsAgent: "Agent vs agent",
    agentVsAgentDescription: "Two MCP agents play while you watch.",
    spectating: "spectating",
    yourColor: "Your color:",
    difficulty: "Difficulty:",
    difficultyEasy: "Easy (1 ply)",
    difficultyMedium: "Medium (3 plies)",
    difficultyHard: "Hard (up to 5 plies)",
    startLocal: "Start local game",
    startAlgorithmMatch: "Play the algorithm",
    startMatch: "Start match",
    startAgentMatch: "Start agent match",
    creating: "Creating…",
    humanHint:
      "After starting, ask the agent to call join_game. The open side is assigned automatically.",
    algorithmHint:
      "The browser runs negamax with alpha-beta pruning; no neural network is used.",
    agentHint:
      "The first agent calls join_game with a color; the second receives the other side.",
    newGame: "New game",
    exitToMenu: "Return to main menu",
    gameLabel: "Chess game",
    controlsLabel: "Game controls",
    connectionsLabel: "Agent connections",
    flipBoard: "Board",
    resetBoard: "Restore normal board orientation",
    undo: "Undo move",
    playerHuman: "Human",
    playerAlgorithm: "Algorithm",
    playerAgent: "Agent",
    algorithmThinking: "Algorithm is choosing a move…",
    noConnection: "Offline",
    connected: "Connected",
    waiting: "Waiting",
    sendingMove: "Sending move…",
    connectionLost: "Connection to the chess server was lost",
    history: "Move history",
    gameNotStarted: "The game has not started yet",
    choosePromotion: "Choose a piece",
    cancel: "Cancel",
    newGameTitle: "Start a new game?",
    exitTitle: "Return to the menu?",
    resetLocalDescription: "Your current game progress will be reset.",
    resetOnlineDescription:
      "The current online game will be replaced with a new one.",
    exitLocalDescription: "The current game will be closed.",
    exitOnlineDescription:
      "The current online game will be closed for this client.",
    restart: "Start again",
    exit: "Exit",
    back: "Back",
    connecting: "Connecting to the active game…",
    white: "White",
    black: "Black",
    turn: (color) => `${color} to move`,
    check: (color) => `Check — ${color} to move`,
    checkmate: (color) => `Checkmate! ${color} win`,
    resigned: (color) => `Resignation. ${color} win`,
    stalemate: "Stalemate — draw",
    draw: (reason) => `Draw (${reason})`,
    fiftyMove: "fifty-move rule",
    threefold: "threefold repetition",
    insufficientMaterial: "insufficient material",
  },
  "zh-CN": {
    language: "语言",
    soundOn: "声音已开启",
    soundOff: "声音已关闭",
    settings: "设置",
    effects: "效果",
    noEffects: "无效果",
    classicEffects: "经典",
    overdriveEffects: "狂热",
    showMoveHints: "显示可走位置",
    showTimer: "显示计时器",
    gameTime: "对局时间",
    localeName: "简体中文",
    title: "♛ 国际象棋",
    chooseMode: "选择对局模式",
    localSubtitle: "经典对局 — 本地双人",
    localMode: "本地对局",
    localDescription: "两人在同一屏幕对弈，无需服务器或智能体。",
    humanVsAlgorithm: "人类对算法",
    humanVsAlgorithmDescription: "本地国际象棋算法，无需神经网络或 MCP。",
    humanVsAgent: "人类对智能体",
    humanVsAgentDescription: "你在棋盘上走棋，智能体通过 MCP 连接。",
    agentVsAgent: "智能体对智能体",
    agentVsAgentDescription: "两个 MCP 智能体对弈，你可以观战。",
    spectating: "观战",
    yourColor: "你的执棋颜色：",
    difficulty: "难度：",
    difficultyEasy: "简单（1 个半回合）",
    difficultyMedium: "中等（3 个半回合）",
    difficultyHard: "困难（最多 5 个半回合）",
    startLocal: "开始本地对局",
    startAlgorithmMatch: "与算法对弈",
    startMatch: "开始对局",
    startAgentMatch: "开始智能体对局",
    creating: "正在创建…",
    humanHint: "开始后请让智能体调用 join_game，空闲方会自动分配。",
    algorithmHint:
      "算法在浏览器中运行：采用 negamax 和 alpha-beta 剪枝，不使用神经网络。",
    agentHint: "第一个智能体使用指定颜色调用 join_game，第二个获得另一方。",
    newGame: "新对局",
    exitToMenu: "返回主菜单",
    gameLabel: "国际象棋对局",
    controlsLabel: "对局控制",
    connectionsLabel: "智能体连接",
    flipBoard: "翻转棋盘",
    resetBoard: "恢复棋盘默认方向",
    undo: "悔棋",
    playerHuman: "人类",
    playerAlgorithm: "算法",
    playerAgent: "智能体",
    algorithmThinking: "算法正在选择走法…",
    noConnection: "未连接",
    connected: "已连接",
    waiting: "等待中",
    sendingMove: "正在提交走法…",
    connectionLost: "与国际象棋服务器的连接已断开",
    history: "走法记录",
    gameNotStarted: "对局尚未开始",
    choosePromotion: "选择升变棋子",
    cancel: "取消",
    newGameTitle: "开始新对局？",
    exitTitle: "返回菜单？",
    resetLocalDescription: "当前对局进度将被重置。",
    resetOnlineDescription: "当前在线对局将被替换为新对局。",
    exitLocalDescription: "当前对局将被关闭。",
    exitOnlineDescription: "当前在线对局将为此客户端关闭。",
    restart: "重新开始",
    exit: "退出",
    back: "返回",
    connecting: "正在连接到当前对局…",
    white: "白方",
    black: "黑方",
    turn: (color) => `轮到${color}走棋`,
    check: (color) => `将军 — 轮到${color}走棋`,
    checkmate: (color) => `将死！${color}获胜`,
    resigned: (color) => `认输。${color}获胜`,
    stalemate: "逼和 — 和棋",
    draw: (reason) => `和棋（${reason}）`,
    fiftyMove: "五十回合规则",
    threefold: "三次重复局面",
    insufficientMaterial: "子力不足",
  },
};

const pieceNames: Record<Locale, Record<Color, Record<PieceType, string>>> = {
  ru: {
    w: {
      p: "Белая пешка",
      n: "Белый конь",
      b: "Белый слон",
      r: "Белая ладья",
      q: "Белый ферзь",
      k: "Белый король",
    },
    b: {
      p: "Чёрная пешка",
      n: "Чёрный конь",
      b: "Чёрный слон",
      r: "Чёрная ладья",
      q: "Чёрный ферзь",
      k: "Чёрный король",
    },
  },
  en: {
    w: {
      p: "White pawn",
      n: "White knight",
      b: "White bishop",
      r: "White rook",
      q: "White queen",
      k: "White king",
    },
    b: {
      p: "Black pawn",
      n: "Black knight",
      b: "Black bishop",
      r: "Black rook",
      q: "Black queen",
      k: "Black king",
    },
  },
  "zh-CN": {
    w: { p: "白兵", n: "白马", b: "白象", r: "白车", q: "白后", k: "白王" },
    b: { p: "黑兵", n: "黑马", b: "黑象", r: "黑车", q: "黑后", k: "黑王" },
  },
};

const localeOrder: Locale[] = ["ru", "en", "zh-CN"];
const storageKey = "chess-arena-locale";

function detectLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (localeOrder.includes(saved as Locale)) return saved as Locale;
  } catch {
    // The browser can disable storage; the UI still falls back to its locale.
  }

  const browserLocale = navigator.language.toLowerCase();
  if (browserLocale.startsWith("zh")) return "zh-CN";
  if (browserLocale.startsWith("ru")) return "ru";
  return "en";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  colorName: (color: Color) => string;
  pieceName: (color: Color, piece: PieceType) => string;
  statusText: (status: GameStatus, turn: Color) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;

    try {
      window.localStorage.setItem(storageKey, locale);
    } catch {
      // Keep the selected language for this session when storage is unavailable.
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t = messages[locale];
    const colorName = (color: Color) => (color === "w" ? t.white : t.black);
    const pieceName = (color: Color, piece: PieceType) =>
      pieceNames[locale][color][piece];
    const statusText = (status: GameStatus, turn: Color) => {
      if (status.kind === "ongoing") {
        return status.check
          ? t.check(colorName(turn))
          : t.turn(colorName(turn));
      }
      if (status.kind === "checkmate")
        return t.checkmate(colorName(status.winner));
      if (status.kind === "resigned")
        return t.resigned(colorName(status.winner));
      if (status.kind === "stalemate") return t.stalemate;
      const reasons = {
        "fifty-move": t.fiftyMove,
        threefold: t.threefold,
        "insufficient-material": t.insufficientMaterial,
      } as const;
      return t.draw(reasons[status.reason]);
    };
    return { locale, setLocale, t, colorName, pieceName, statusText };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Context hook intentionally shares this module with the provider and selector.
// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="language-switcher">
      <span className="language-switcher__label">{t.language}</span>
      <select
        aria-label={t.language}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {localeOrder.map((option) => (
          <option key={option} value={option}>
            {messages[option].localeName}
          </option>
        ))}
      </select>
    </label>
  );
}
