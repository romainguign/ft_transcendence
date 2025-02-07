// Déclaration pour étendre l'interface Window
import "../styles/pong-game.css";

declare global {
	interface Window {
		initializePongGame?: () => void;
	}
}

interface Ball {
	x: number;
	y: number;
	speedX: number;
	speedY: number;
	radius: number;
	maxSpeed: number;
}

type PaddlePhase = "none" | "grow" | "shrink" | "return";

interface PaddleAnimation {
	scale: number;
	phase: PaddlePhase;
	time: number;
}

interface Paddles {
	width: number;
	height: number;
	player1Y: number;
	player2Y: number;
	speed: number;
	animations: {
		player1: PaddleAnimation;
		player2: PaddleAnimation;
	};
}

interface Scores {
	player1: number;
	player2: number;
	winning: number;
}

interface Controls {
	player1Up: boolean;
	player1Down: boolean;
	player2Up: boolean;
	player2Down: boolean;
}

interface Colors {
	groundColor: string;
	ballColor: string;
	paddleColor: string;
}

interface GameState {
	ball: Ball;
	paddles: Paddles;
	scores: Scores;
	controls: Controls;
	color: Colors;
	running: boolean;
	countdown: number;
	countdownActive: boolean;
	countdownOpacity: number;
	fadingOut: boolean;
	lastTime: number;
}

export default function initializePongGame(): void {
	// ======================
	// Configuration initiale
	// ======================
	const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement | null;
	if (!canvas) {
		console.error("Canvas non trouvé");
		return;
	}
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		console.error("Contexte 2D non trouvé");
		return;
	}

	// Éléments UI
	const elements = {
		playButton: document.getElementById("play-button") as HTMLElement | null,
		menu: document.getElementById("pong-menu") as HTMLElement | null,
		score1: document.getElementById("player1-score") as HTMLElement | null,
		score2: document.getElementById("player2-score") as HTMLElement | null,
		customButton: document.getElementById("custom-button") as HTMLElement | null,
		customBackButton: document.getElementById("custom-back-button") as HTMLElement | null,
		customColorsInputs: document.querySelectorAll(".color-input") as NodeListOf<HTMLInputElement>,
		customSliders: document.querySelectorAll(".pong-custom-slider") as NodeListOf<HTMLInputElement>,
		winningScoreSlider: document.getElementById("winning-score-slider") as HTMLInputElement | null
	};

	// ======================
	// État du jeu
	// ======================
	const state: GameState = {
		// Physique
		ball: {
			x: canvas.width / 2,
			y: canvas.height / 2,
			speedX: 250,
			speedY: 250,
			radius: 6,
			maxSpeed: 1000
		},

		paddles: {
			width: 7,
			height: 100,
			player1Y: (canvas.height - 100) / 2,
			player2Y: (canvas.height - 100) / 2,
			speed: 300,
			animations: {
				player1: { scale: 1, phase: "none", time: 0 },
				player2: { scale: 1, phase: "none", time: 0 }
			}
		},

		// Scores
		scores: {
			player1: 0,
			player2: 0,
			winning: 3
		},

		// Contrôles
		controls: {
			player1Up: false,
			player1Down: false,
			player2Up: false,
			player2Down: false
		},

		color: {
			groundColor: "#fff",
			ballColor: "#fff",
			paddleColor: "#fff"
		},

		// État
		running: false,
		countdown: 3,
		countdownActive: false,
		countdownOpacity: 1.0,
		fadingOut: false,
		lastTime: performance.now()
	};

	// ======================
	// Fonctions de base
	// ======================
	function drawPaddles(): void {
		if (!ctx || !canvas)
			return;
		ctx.fillStyle = state.color.paddleColor;

		// Dessiner player1 avec animation
		const anim1 = state.paddles.animations.player1;
		const width1 = state.paddles.width * anim1.scale;
		const height1 = state.paddles.height * anim1.scale;
		ctx.fillRect(
			3 - (width1 - state.paddles.width) / 2,
			state.paddles.player1Y - (height1 - state.paddles.height) / 2,
			width1,
			height1
		);

		// Dessiner player2 avec animation
		const anim2 = state.paddles.animations.player2;
		const width2 = state.paddles.width * anim2.scale;
		const height2 = state.paddles.height * anim2.scale;
		ctx.fillRect(
			canvas.width - width2 - 3 - (width2 - state.paddles.width) / 2,
			state.paddles.player2Y - (height2 - state.paddles.height) / 2,
			width2,
			height2
		);
	}

	function drawBall(): void {
		if (!ctx)
			return;
		ctx.beginPath();
		ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
		ctx.fillStyle = state.color.ballColor;
		ctx.fill();
		ctx.closePath();
	}

	function updateScores(): void {
		if (elements.score1) {
			elements.score1.textContent = state.scores.player1.toString();
		}
		if (elements.score2) {
			elements.score2.textContent = state.scores.player2.toString();
		}
	}

	// ======================
	// Logique de collision
	// ======================
	function checkPaddleCollision(): void {
		const pw = state.paddles.width;
		const ph = state.paddles.height;

		if (!canvas)
			return;

		// Collision pour le joueur 1
		if (
			state.ball.x - state.ball.radius < pw + 3 &&
			state.ball.y > state.paddles.player1Y &&
			state.ball.y < state.paddles.player1Y + ph
		) {
			handlePaddleBounce("player1");
		}

		// Collision pour le joueur 2
		if (
			state.ball.x + state.ball.radius > canvas.width - (pw + 3) &&
			state.ball.y > state.paddles.player2Y &&
			state.ball.y < state.paddles.player2Y + ph
		) {
			handlePaddleBounce("player2");
		}
	}

	function handlePaddleBounce(player: "player1" | "player2"): void {
		state.paddles.animations[player] = {
			scale: 1.05,
			phase: "grow",
			time: 0
		};

		const paddleY = player === "player1" ? state.paddles.player1Y : state.paddles.player2Y;
		const relativeIntersect =
			(state.ball.y - paddleY) / state.paddles.height - 0.5;
		const bounceAngle = relativeIntersect * (Math.PI / 3); // ±60 degrés max

		// Ajustement de la vitesse
		const speedMultiplier = 1.1;
		const currentSpeed = Math.hypot(state.ball.speedX, state.ball.speedY);
		const newSpeed = Math.min(currentSpeed * speedMultiplier, state.ball.maxSpeed);

		// Nouvelle direction
		state.ball.speedX = (player === "player1" ? 1 : -1) * newSpeed * Math.cos(bounceAngle);
		state.ball.speedY = newSpeed * Math.sin(bounceAngle);
	}

	function checkWallCollision(): void {
		// Mur haut/bas

		if (!canvas)
			return;

		if (
			state.ball.y - state.ball.radius <= 0 ||
			state.ball.y + state.ball.radius >= canvas.height
		) {
			state.ball.speedY *= -1;
		}

		// Sortie latérale
		if (state.ball.x - state.ball.radius < 0) {
			state.scores.player2++;
			resetBall();
		} else if (state.ball.x + state.ball.radius > canvas.width) {
			state.scores.player1++;
			resetBall();
		}
	}

	// ======================
	// Logique de jeu
	// ======================
	function update(deltaTime: number): void {

		if (!canvas)
			return;

		if (state.countdownActive) {
			state.countdown -= deltaTime;
			if (state.countdown <= 0) {
				state.countdownActive = false;
				state.fadingOut = true;
			}
		}

		if (state.fadingOut) {
			state.countdownOpacity -= deltaTime;
			if (state.countdownOpacity <= 0) {
				state.fadingOut = false;
				state.running = true;
			}
		}

		if (!state.running) return;

		(["player1", "player2"] as const).forEach((player) => {
			const anim = state.paddles.animations[player];
			if (anim.phase !== "none") {
				anim.time += deltaTime;

				if (anim.phase === "grow") {
					if (anim.time >= 0.2) {
						anim.phase = "shrink";
						anim.scale = 0.9;
						anim.time = 0;
					}
				} else if (anim.phase === "shrink") {
					if (anim.time >= 0.2) {
						anim.phase = "return";
						anim.scale = 1;
						anim.time = 0;
					}
				} else if (anim.phase === "return") {
					if (anim.time >= 0.6) {
						anim.phase = "none";
					}
				}
			}
		});

		// Mouvement des joueurs
		if (state.controls.player1Up && state.paddles.player1Y > 5) {
			state.paddles.player1Y -= state.paddles.speed * deltaTime;
		}
		if (state.controls.player1Down && state.paddles.player1Y < canvas.height - state.paddles.height - 5) {
			state.paddles.player1Y += state.paddles.speed * deltaTime;
		}

		if (state.controls.player2Up && state.paddles.player2Y > 5) {
			state.paddles.player2Y -= state.paddles.speed * deltaTime;
		}
		if (state.controls.player2Down && state.paddles.player2Y < canvas.height - state.paddles.height - 5) {
			state.paddles.player2Y += state.paddles.speed * deltaTime;
		}

		// Mouvement de la balle
		state.ball.x += state.ball.speedX * deltaTime;
		state.ball.y += state.ball.speedY * deltaTime;

		// Collisions
		checkWallCollision();
		checkPaddleCollision();

		// Vérification victoire
		if (
			state.scores.player1 >= state.scores.winning ||
			state.scores.player2 >= state.scores.winning
		) {
			endGame();
		}
	}

	function resetBall(): void {

		if (!canvas)
			return;

		state.ball.x = canvas.width / 2;
		state.ball.y = canvas.height / 2;
		state.ball.speedX = 250 * (Math.random() > 0.5 ? 1 : -1);
		state.ball.speedY = 250 * (Math.random() > 0.5 ? 1 : -1);
	}

	function endGame(): void {
		state.running = false;
		elements.menu?.classList.remove("hidden");
		resetBall();
	}

	// ======================
	// Gestion des événements
	// ======================
	function handleKeyDown(e: KeyboardEvent): void {
		switch (e.key) {
			case "w":
				state.controls.player1Up = true;
				break;
			case "s":
				state.controls.player1Down = true;
				break;
			case "ArrowUp":
				state.controls.player2Up = true;
				break;
			case "ArrowDown":
				state.controls.player2Down = true;
				break;
		}
	}

	function handleKeyUp(e: KeyboardEvent): void {
		switch (e.key) {
			case "w":
				state.controls.player1Up = false;
				break;
			case "s":
				state.controls.player1Down = false;
				break;
			case "ArrowUp":
				state.controls.player2Up = false;
				break;
			case "ArrowDown":
				state.controls.player2Down = false;
				break;
		}
	}

	function drawCountdown(): void {
		if (state.countdownActive) {
			const currentCount = Math.ceil(state.countdown);
			if (currentCount > 0) {
				drawCountElement(currentCount.toString());
			}
		} else if (state.fadingOut) {
			drawCountElement("GO", state.countdownOpacity);
		}
	}

	function drawCountElement(text: string, opacity: number = 1.0): void {
		// Cercle de fond

		if (!ctx || !canvas)
			return;

		ctx.beginPath();
		ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
		ctx.fillStyle = `rgba(224, 122, 236, ${opacity * 0.7})`;
		ctx.fill();

		// Texte
		ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
		ctx.font = "50px Aeonik";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 5);

		// Contour
		ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
		ctx.lineWidth = 4;
		ctx.stroke();
		ctx.closePath();
	}

	function startGame(): void {
		elements.menu?.classList.remove("show");
		setTimeout(() => {
			elements.menu?.classList.add("hidden");
		}, 500);
		state.running = false;
		state.scores.player1 = 0;
		state.scores.player2 = 0;
		elements.menu?.classList.add("hidden");
		updateScores();
		resetBall();

		// Initialiser le compte à rebours
		state.countdown = 3;
		state.countdownActive = true;
		state.fadingOut = false;
		state.countdownOpacity = 1.0;
	}

	// ======================
	// Cycle principal
	// ======================
	function gameLoop(currentTime: number): void {

		if (!ctx || !canvas)
			return;

		const deltaTime = (currentTime - state.lastTime) / 1000;
		state.lastTime = currentTime;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Terrain
		ctx.fillStyle = state.color.groundColor;
		ctx.fillRect(canvas.width / 2 - 1, 0, 2, canvas.height);

		drawPaddles();
		drawBall();
		update(deltaTime);

		if (state.countdownActive || state.fadingOut) {
			drawCountdown();
		}

		requestAnimationFrame(gameLoop);
	}

	// ======================
	// Custom menu
	// ======================
	function openCustomMenu(): void {
		elements.menu?.classList.remove("show");
		const customMenu = document.getElementById("pong-custom-menu");
		if (customMenu) {
			customMenu.classList.remove("hidden");
			customMenu.classList.add("show");
		}

		setTimeout(() => {
			elements.menu?.classList.add("hidden");
		}, 350);

		const pongGame = document.getElementById("pong-game");
		if (pongGame) {
			pongGame.classList.remove("main-menu");
			pongGame.classList.add("pong-custom-menu-canvas");
		}
	}

	function closeCustomMenu(): void {
		const customMenu = document.getElementById("pong-custom-menu");
		if (customMenu) {
			customMenu.classList.remove("show");
			customMenu.classList.add("hidden");
		}
		elements.menu?.classList.remove("hidden");

		setTimeout(() => {
			elements.menu?.classList.add("show");
		}, 50);

		const pongGame = document.getElementById("pong-game");
		if (pongGame) {
			pongGame.classList.remove("pong-custom-menu-canvas");
			pongGame.classList.add("main-menu");
		}
	}

	function changeColors(event: Event): void {
		const input = event.target as HTMLInputElement;
		const id = input.id;
		const color = input.value;

		input.style.backgroundColor = color;

		switch (id) {
			case "pong-ground-color":
				state.color.groundColor = color;
				document.getElementById("pongCanvas")?.style.setProperty('--ground-color', `${color}`);
				break;
			case "pong-ball-color":
				state.color.ballColor = color;
				break;
			case "pong-paddle-color":
				state.color.paddleColor = color;
				break;
		}
	}

	function sliderAnimation(event: Event): void {
		const slider = event.target as HTMLInputElement;
		// On considère que les attributs min et max existent et sont convertibles en nombre
		const min = parseFloat(slider.min);
		const max = parseFloat(slider.max);
		const value = 5 + ((parseFloat(slider.value) - min) / (max - min)) * 90;
		slider.style.setProperty('--slider-track-bg', `linear-gradient(to right, #BB70AD 0%, #BB70AD ${value}%, #ffffff ${value}%)`);
	}

	function changeWinningScore(event: Event): void {
		const slider = event.target as HTMLInputElement;
		state.scores.winning = Math.floor(parseFloat(slider.value));
		const winningScoreElem = document.getElementById("pong-winning-score");
		if (winningScoreElem) {
			winningScoreElem.textContent = "Winning score : " + state.scores.winning;
		}
	}

	// ======================
	// Initialisation
	// ======================
	function init(): void {
		setTimeout(() => {
			elements.menu?.classList.add("show");
		}, 50);

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("keyup", handleKeyUp);
		elements.playButton?.addEventListener("click", startGame);
		elements.customButton?.addEventListener("click", openCustomMenu);
		elements.customBackButton?.addEventListener("click", closeCustomMenu);
		elements.customColorsInputs.forEach((input) => {
			input.addEventListener("input", changeColors);
		});
		elements.customSliders.forEach((slider) => {
			slider.addEventListener("input", sliderAnimation);
		});
		elements.winningScoreSlider?.addEventListener("input", changeWinningScore);

		requestAnimationFrame(gameLoop);
	}

	init();
}

// Export pour SPA
if (typeof window !== "undefined") {
	window.initializePongGame = initializePongGame;
}

export {}; // Pour s'assurer que le fichier est un module
