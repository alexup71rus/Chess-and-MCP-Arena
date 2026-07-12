// Публичный API шахматного движка.
// Все правила шахмат инкапсулированы здесь; UI работает только с этим модулем.

export * from "./types";
export * from "./geometry";
export * from "./fen";
export { isSquareAttacked, findKing } from "./attack";
export {
  generatePseudoLegalMoves,
  generatePseudoLegalFrom,
} from "./moveGeneration/pseudoLegal";
export {
  generateLegalMoves,
  generateLegalMovesFrom,
  isInCheck,
} from "./legalMoves";
export { makeMove } from "./makeMove";
export { gameStatus, positionKey, hasInsufficientMaterial } from "./gameState";
export { toSAN } from "./notation";
