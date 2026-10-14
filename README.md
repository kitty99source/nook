# The Nook

The Nook is one chat room in the browser. Colleagues join here:

**https://nook.prakritichhetri.workers.dev**

Nothing to install. At the door, type the room word `pspsps`, a name, and a picture if you want one. That word is the same for everyone until it is changed. It is not written into `data/config.json`. To change it later, set the Worker secret `NOOK_ROOM_WORD` in the Cloudflare dashboard. Leave it unset and the word stays `pspsps`.

The room stays up when the laptop is shut. Chat is still not a saved archive. It lives with the room, so a quiet hour does not wipe it. A normal code deploy does not clear it either. Deleting that room’s storage does. **Copy chat** and **Save to note** are the only ways a transcript leaves, and only because that person asked.

Click a picture in the chat and it opens larger inside the chat window. The town stays on the page behind it. Close the picture with the close control, the dark area around it, or Escape.

## Who does what

**Chat-only person.** Open the standing link. Type `pspsps`, what to call you, and a picture if you like.

**Coder.** Prakriti adds you as a collaborator on this private GitHub repo when you should edit the code. Then clone it, install Node 24, and run the start script. You do not need to be a collaborator just to chat. The start script is for working on the code on your laptop. It is not how colleagues get in.

## How to work on the code

Needs Node 24. No install step and no build step.

On a Mac, double-click `start-nook.command`.

On Windows, double-click `start-nook.bat`.

Both run `scripts/start.mjs`. The script opens a local room in the default browser, on `127.0.0.1` only. The door word is the same `pspsps`, unless `NOOK_ROOM_WORD` is set in the environment. Closing that window stops only the local room.

To publish a change to the standing link, from this repo:

```
npx wrangler deploy
```

Colleagues keep the same URL. Open tabs ask for the new page. There is no dist folder to commit.

## How a chat-only person joins

Open https://nook.prakritichhetri.workers.dev. Nothing to install.

That is the whole step. They use a normal browser. They never clone the repo.

## How a coder joins

1. Ask Prakriti to add your GitHub user as a collaborator on this private repo.
2. Clone it.
3. Install Node 24.
4. On a Mac, double-click `start-nook.command`. On Windows, double-click `start-nook.bat`.

Do not commit `data/`, secrets, or room words. See below.

## File map

| Path | What it is |
| --- | --- |
| `room.mjs` | The room behaviour. Messages, who is here, locked files, and the latest place for each person. Used by the laptop and by the Worker. |
| `public/index.html`, `public/app.js`, `public/app.css` | The page: door, the chat window, composer, Settings. |
| `public/vapor.js` | On the codeword screen, a Vapor theme covers the page with the scene and hides the game. Once the room is open, that full-page scene comes down so the game is the background. Chat scene mounts `#vapor-chat` as the first thing inside the chat window. |
| `public/vapor-art.js` | The sun, mountains, clouds, floor and chrome blobs, drawn in code. `panelSceneMarkup` is the smaller scene for the chat window (no blobs). Vapor themes only. |
| `public/vapor.css` | How that scene sits on the page and how it moves. |
| `public/popup.js` | Square windows over the world: drag by the bar, resize from the corner, minimise to the tray. Remembers only window layout in this browser. |
| `public/e2e.js` | Browser encryption. Web Crypto only. Keys stay in memory. |
| `public/whimsy.js`, `public/affirmations.js` | Disco cats, sequins and the disco light, the affirmation cat, and its lines. |
| `public/colosseum.js` | The town game: walking, Tab between chat and world, combat, NPC talk, place cards, the Colosseum window. Positions travel as locked game parcels. |
| `public/colosseum-logic.mjs` | Pure rules: coins, bets, shop, bag, home works, walking and walls, weapons and the lightsaber block, skill tree, friendship stages, the clue trail and the second planet gate. Tested. |
| `public/colosseum-world.mjs` | The maps: Lantern Moon town, the tavern, market, Mallow's house, observatory, old cinema, home station, and Velvet Reach. |
| `public/colosseum-story.mjs` | Every NPC line. Edit freely; only the text matters to the game. |
| `public/colosseum-art.js`, `public/colosseum.css` | Original pixel art drawn in code, and the game's HUD styles. |
| `server.mjs` | The local room for coding. HTTP and a WebSocket on `127.0.0.1`. Calls `room.mjs`. |
| `public/paperclip.png` | The attach-button picture. Original file, background removed. |
| `stickers/` | Sticker art that ships with the app. Not anyone’s conversation. |
| `worker.mjs`, `wrangler.jsonc` | The standing Worker. Static files are assets. One Durable Object holds the live room. |
| `start-nook.command` | Mac double-click. |
| `start-nook.bat` | Windows double-click. |
| `scripts/start.mjs` | Starts the local room and opens the browser. For coding. |
| `live-socket.mjs` | The WebSocket frames for the local room. |
| `test/colosseum.test.mjs`, `test/room.test.mjs` | `node --test`. |
| `data/` | Optional local config on the coding laptop (`data/config.json` may hold a host name). Git-ignored. Not messages. |

## Themes

Settings lists Paper, Dark, Cyberpunk, Akira Red, Vapor pastel, Vapor sunset, and Vapor neon. A Vapor theme covers the codeword screen with a sun and a floor, and the game stays hidden there. Once you are in the room, the game fills the page. The sun stays below the horizon until you come in, then it climbs inside the chat. A new message flickers for a moment. The windows pick up a hard title bar. If the computer asks for less motion, the scene stays still. The choice stays in this browser.

On a Vapor theme, Settings also shows Chat scene and Window style. Both start on, and each can be switched off. Chat scene draws that sun and floor inside the chat window. Window style is Current look or Retro 90s. Retro 90s is grey windows, a blue title bar, and square buttons. The writing stays dark on the light window so it can be read. These choices stay in this browser too. Other themes hide both controls.

## The world and the windows

The whole window is the world. It is a little retro sci-fi town on Lantern Moon, drawn as small original pixel sprites. Everyone is a space cat. Bad guys are alien space cats on the street.

The chat is a square window. Drag it by its bar, resize it from the corner, minimise it to the tray. Click it to type. Disco cats, Settings, the affirmation cat and the Colosseum are the same kind of window. Settings has "Put the windows back".

Tab pauses the world and puts you in the chat. Tab again, or a click on the world, goes back to playing. In the world, WASD or arrows walk and the mouse aims. Click fires. Hold for the rifle and the beam. Tap for the launcher, fireball and lightsaber. E talks or uses, and 1 to 5 pick from the item bar. A lightsaber tap raises the blade. It blocks a shot whose path crosses the blade.

Walk into a door to go inside. The tavern, market, Mallow's house, observatory, old cinema and the hab block (your home) are rooms. Other people in the room appear as sprites. NPCs are local to each browser.

Velvet Reach, the second planet, stays locked until you have three things. You need all three star chart pieces (found with items you already carry). Mallow must count you as a close friend. You need a Moon rock from your own mine, and 60 coins for the fare.

Pixel bits when an alien pops are off by default. Settings has a gauge from None to Messy. It is a game effect only and never goes into the chat.

Game progress, the picture and the window layout stay in this browser. A picture in the chat opens larger inside that chat window. Other people’s cats move when they move, and a shot on the street can hit them. Aliens stay on your own screen.

## Encryption

Each browser makes an ECDH P-256 key pair in memory when someone comes in. The private key is not extractable and is never written to disk, `localStorage`, or `IndexedDB`. The first person creates an AES-GCM room key and locks a copy to each person’s public key. Later arrivals are given a locked copy by someone who already has the room key. The page says when that happens. Compare the fingerprint on screen. If the fingerprints differ, you are not in the same locked room.

Text, sticker choice, and file bytes are encrypted in the browser before they are sent. The server stores ciphertext, public keys, and wrapped room keys. It does not store file names. A note that is posted twice is rejected. A note whose locked contents name a different sender is dropped.

Limits that stay:

- The standing page is served by the Worker. For local coding, only start the script you trust.
- Cloudflare can see who is here and roughly how big a message is, not the words.
- People should compare the fingerprint on screen.

This is not a Signal-style protocol. There is no separate identity key and no double ratchet.

## What not to commit

`data/` is git-ignored, including `data/config.json`. Do not commit a mailbox password, a room word, `.env` files, or anything from a live chat. Chat is not written to disk by the app. If you copy a transcript yourself, keep that file out of git.

Do not put patient details, NHIs, or claim numbers in the room.
