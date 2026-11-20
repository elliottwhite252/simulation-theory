# Quickstart

In this guide, you'll download Simulation Theory, run it on your computer, and play through the first room. It takes about five minutes.

## Before you begin

You need:

- **Node.js 20 or later.** To check your version, run `node --version`. If you need to install or update it, download it from [nodejs.org](https://nodejs.org).
- **Git**, to download the code.
- A desktop browser such as Chrome, Firefox, Safari, or Edge.
- A keyboard. The game doesn't support controllers or touchscreens yet.

## Step 1: Download the code

Open a terminal and run:

```bash
git clone https://github.com/elliottwhite252/simulation-theory.git
cd simulation-theory
```

## Step 2: Install dependencies

```bash
npm install
```

This installs Phaser (the game engine) and the development tools. It usually takes under a minute.

## Step 3: Start the game

```bash
npm run dev
```

The terminal prints a local address, usually `http://localhost:5173`. Open it in your browser.

## Step 4: Play the first room

1. On the title screen, press **Space** or **Enter**.
2. The opening cutscene plays. Press **Space** to go to the next panel, or **Esc** to skip it.
3. Walk right with **D** or the **right arrow** key. When you reach the first room, the camera locks in place and three enemies appear.
4. Shoot with **Z** and attack up close with **X**. A melee hit defeats an enemy in one blow. A shot takes two.
5. When the room is clear, a **GO** sign appears. Walk right to continue.

You're up and running. To see every control, read [Controls](reference/controls.md).

## Troubleshooting

**`npm install` fails, or `npm run dev` shows a syntax error.**
Your Node.js version is probably older than 20. Run `node --version`, update Node.js, then run `npm install` again.

**The page is blank.**
Open your browser's console (usually **F12**) and check for errors. Make sure the terminal running `npm run dev` is still open, because closing it stops the game.

**There's no sound.**
Browsers block audio until you interact with the page. Press a key or click inside the game. If it's still silent, press **M**, because the music may be muted.

## Next steps

- [Tune the difficulty](how-to/tune-difficulty.md)
- [Rooms and the camera](concepts/rooms-and-camera.md)
