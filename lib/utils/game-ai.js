/**
 * Game AI - Bot opponent logic for single-player games
 * Provides AI opponents for various game types with difficulty levels
 */

const { logger } = require('./logger.js');
class GameAI {
  constructor() {
    this.difficulties = ['easy', 'medium', 'hard'];
  }
  
  /**
   * Get bot move for tic-tac-toe
   * @param {Array} board - 3x3 board array (null for empty, 'X' or 'O' for occupied)
   * @param {string} botSymbol - Bot's symbol ('X' or 'O')
   * @param {string} difficulty - Difficulty level
   * @returns {Object} - { row, col } or null if no valid move
   */
  getTicTacToeMove(board, botSymbol, difficulty = 'medium') {
    const playerSymbol = botSymbol === 'X' ? 'O' : 'X';
    const size = 3;
    
    // Easy: Random valid move
    if (difficulty === 'easy') {
      const emptyCells = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!board[r][c]) {
            emptyCells.push({ row: r, col: c });
          }
        }
      }
      if (emptyCells.length === 0) return null;
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    // Medium: Block immediate threats, otherwise random
    if (difficulty === 'medium') {
      // Check if we can win
      const winningMove = this.findWinningMove(board, botSymbol);
      if (winningMove) return winningMove;
      
      // Block opponent's winning move
      const blockingMove = this.findWinningMove(board, playerSymbol);
      if (blockingMove) return blockingMove;
      
      // Otherwise random
      const emptyCells = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!board[r][c]) {
            emptyCells.push({ row: r, col: c });
          }
        }
      }
      if (emptyCells.length === 0) return null;
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    // Hard: Minimax algorithm (unbeatable)
    if (difficulty === 'hard') {
      const bestMove = this.minimax(board, botSymbol, botSymbol, playerSymbol);
      return bestMove.move || this.getRandomMove(board);
    }
    
    // Default to medium
    return this.getTicTacToeMove(board, botSymbol, 'medium');
  }
  
  /**
   * Find a winning move for a given symbol
   */
  findWinningMove(board, symbol) {
    const size = 3;
    
    // Check all empty cells
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board[r][c]) {
          // Try placing symbol here
          board[r][c] = symbol;
          if (this.checkTicTacToeWin(board, symbol)) {
            board[r][c] = null;
            return { row: r, col: c };
          }
          board[r][c] = null;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if a player has won tic-tac-toe
   */
  checkTicTacToeWin(board, symbol) {
    const size = 3;
    
    // Check rows
    for (let r = 0; r < size; r++) {
      if (board[r].every(cell => cell === symbol)) return true;
    }
    
    // Check columns
    for (let c = 0; c < size; c++) {
      let won = true;
      for (let r = 0; r < size; r++) {
        if (board[r][c] !== symbol) {
          won = false;
          break;
        }
      }
      if (won) return true;
    }
    
    // Check diagonals
    if (board[0][0] === symbol && board[1][1] === symbol && board[2][2] === symbol) return true;
    if (board[0][2] === symbol && board[1][1] === symbol && board[2][0] === symbol) return true;
    
    return false;
  }
  
  /**
   * Minimax algorithm for unbeatable tic-tac-toe AI
   */
  minimax(board, currentSymbol, aiSymbol, playerSymbol) {
    const size = 3;
    
    // Check terminal states
    if (this.checkTicTacToeWin(board, aiSymbol)) {
      return { score: 10 };
    }
    if (this.checkTicTacToeWin(board, playerSymbol)) {
      return { score: -10 };
    }
    
    // Check for draw
    let isFull = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board[r][c]) {
          isFull = false;
          break;
        }
      }
    }
    if (isFull) {
      return { score: 0 };
    }
    
    const moves = [];
    
    // Try all empty cells
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board[r][c]) {
          board[r][c] = currentSymbol;
          
          const nextSymbol = currentSymbol === aiSymbol ? playerSymbol : aiSymbol;
          const result = this.minimax(board, nextSymbol, aiSymbol, playerSymbol);
          
          moves.push({
            row: r,
            col: c,
            score: result.score
          });
          
          board[r][c] = null;
        }
      }
    }
    
    // Choose best move
    let bestMove;
    if (currentSymbol === aiSymbol) {
      // AI wants to maximize
      let bestScore = -Infinity;
      for (const move of moves) {
        if (move.score > bestScore) {
          bestScore = move.score;
          bestMove = move;
        }
      }
    } else {
      // Player wants to minimize
      let bestScore = Infinity;
      for (const move of moves) {
        if (move.score < bestScore) {
          bestScore = move.score;
          bestMove = move;
        }
      }
    }
    
    return bestMove;
  }
  
  /**
   * Get random valid move for tic-tac-toe
   */
  getRandomMove(board) {
    const size = 3;
    const emptyCells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board[r][c]) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
    if (emptyCells.length === 0) return null;
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }
  
  /**
   * Generate a math problem
   * @param {string} difficulty - easy, medium, hard
   * @returns {Object} - { question, answer }
   */
  generateMathProblem(difficulty = 'medium') {
    let min, max, operations;
    
    switch (difficulty) {
      case 'easy':
        min = 1;
        max = 10;
        operations = ['+', '-'];
        break;
      case 'hard':
        min = 100;
        max = 1000;
        operations = ['+', '-', '*'];
        break;
      case 'medium':
      default:
        min = 10;
        max = 100;
        operations = ['+', '-', '*'];
        break;
    }
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1 = Math.floor(Math.random() * (max - min + 1)) + min;
    let num2 = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Ensure positive results for subtraction
    if (operation === '-' && num1 < num2) {
      [num1, num2] = [num2, num1];
    }
    
    let answer;
    switch (operation) {
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        answer = num1 - num2;
        break;
      case '*':
        // Keep multiplication smaller
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = num1 * num2;
        break;
    }
    
    return {
      question: `${num1} ${operation} ${num2} = ?`,
      answer,
      num1,
      num2,
      operation
    };
  }
  
  /**
   * Pick a random number for guess-the-number game
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number}
   */
  pickRandomNumber(min = 1, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Get bot choice for rock-paper-scissors
   * @returns {string} - 'rock', 'paper', or 'scissors'
   */
  getRPSChoice() {
    const choices = ['rock', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
  }
  
  /**
   * Determine winner for rock-paper-scissors
   * @param {string} playerChoice - Player's choice
   * @param {string} botChoice - Bot's choice
   * @returns {string} - 'player', 'bot', or 'draw'
   */
  determineRPSWinner(playerChoice, botChoice) {
    const normalizedPlayer = playerChoice.toLowerCase();
    const normalizedBot = botChoice.toLowerCase();
    
    if (normalizedPlayer === normalizedBot) {
      return 'draw';
    }
    
    if (
      (normalizedPlayer === 'rock' && normalizedBot === 'scissors') ||
      (normalizedPlayer === 'paper' && normalizedBot === 'rock') ||
      (normalizedPlayer === 'scissors' && normalizedBot === 'paper')
    ) {
      return 'player';
    }
    
    return 'bot';
  }
  
  /**
   * Get trivia question from built-in question bank
   * @param {string} category - Optional category filter
   * @param {string} difficulty - Optional difficulty filter
   * @returns {Object} - { question, options, answer, category, difficulty }
   */
  getTriviaQuestion(category = null, difficulty = null) {
    const questions = this.getQuestionBank();
    
    let filtered = questions;
    if (category) {
      filtered = filtered.filter(q => q.category === category);
    }
    if (difficulty) {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }
    
    if (filtered.length === 0) {
      filtered = questions; // Fallback to all questions
    }
    
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
  }
  
  /**
   * Built-in trivia question bank
   * @returns {Array}
   */
  getQuestionBank() {
    return [
      {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        answer: "Paris",
        category: "geography",
        difficulty: "easy"
      },
      {
        question: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        answer: "Mars",
        category: "science",
        difficulty: "easy"
      },
      {
        question: "Who wrote 'Romeo and Juliet'?",
        options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
        answer: "William Shakespeare",
        category: "literature",
        difficulty: "easy"
      },
      {
        question: "What is the largest ocean on Earth?",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        answer: "Pacific Ocean",
        category: "geography",
        difficulty: "easy"
      },
      {
        question: "What year did World War II end?",
        options: ["1943", "1944", "1945", "1946"],
        answer: "1945",
        category: "history",
        difficulty: "medium"
      },
      {
        question: "What is the chemical symbol for gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        answer: "Au",
        category: "science",
        difficulty: "medium"
      },
      {
        question: "Who painted the Mona Lisa?",
        options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
        answer: "Leonardo da Vinci",
        category: "art",
        difficulty: "easy"
      },
      {
        question: "What is the smallest prime number?",
        options: ["0", "1", "2", "3"],
        answer: "2",
        category: "mathematics",
        difficulty: "easy"
      },
      {
        question: "Which element has the atomic number 1?",
        options: ["Helium", "Hydrogen", "Lithium", "Carbon"],
        answer: "Hydrogen",
        category: "science",
        difficulty: "medium"
      },
      {
        question: "In which year did the Titanic sink?",
        options: ["1910", "1911", "1912", "1913"],
        answer: "1912",
        category: "history",
        difficulty: "medium"
      },
      {
        question: "What is the speed of light?",
        options: ["299,792 km/s", "199,792 km/s", "399,792 km/s", "499,792 km/s"],
        answer: "299,792 km/s",
        category: "science",
        difficulty: "hard"
      },
      {
        question: "Who developed the theory of relativity?",
        options: ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Galileo Galilei"],
        answer: "Albert Einstein",
        category: "science",
        difficulty: "easy"
      },
      {
        question: "What is the largest mammal in the world?",
        options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
        answer: "Blue Whale",
        category: "nature",
        difficulty: "easy"
      },
      {
        question: "Which country invented pizza?",
        options: ["France", "Spain", "Italy", "Greece"],
        answer: "Italy",
        category: "culture",
        difficulty: "easy"
      },
      {
        question: "What is the hardest natural substance?",
        options: ["Gold", "Iron", "Diamond", "Platinum"],
        answer: "Diamond",
        category: "science",
        difficulty: "easy"
      }
    ];
  }
  
  /**
   * Simulate thinking delay for bot moves
   * @param {number} minMs - Minimum delay in milliseconds
   * @param {number} maxMs - Maximum delay in milliseconds
   * @returns {Promise} - Resolves after delay
   */
  async think(minMs = 1000, maxMs = 3000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Singleton instance
const gameAI = new GameAI();

