# The Nook

The Nook is one chat room in the browser. It exists only on the laptop that starts it, and only while that script is still open. Close the script and the room is gone.

Messages are not saved. They stay in memory as locked parcels so the people in the room can read them while it is open. **Copy chat** and **Save to note** are the only ways a transcript leaves, and only because that person asked.

Colleagues who only chat do not install git, Node, or this app. They open a URL.

## Who does what

**Host.** Prakriti, or whoever is running the room, double-clicks the start script on their laptop. The script opens the room in their browser and prints a link. On that page they set a code word for this opening. It is not saved. They can copy it from the room and send it wherever they like. Closing the terminal, or Ctrl+C, stops the chat for everyone, and the code word goes with it.

**Chat-only person.** Open the link in a browser. Nothing to install. If the host is still choosing a code word, the page asks you to wait. Then type that word at the door, and what to call you.

**Coder.** Prakriti adds you as a collaborator on this private GitHub repo when you should edit the code. Then clone it, install Node 24, and run the start script. You do not need to be a collaborator just to chat.

## How to run it

Needs Node 24. No install step and no build step.

On a Mac, double-click `start-nook.command`.

On Windows, double-click `start-nook.bat`.

Both run `scripts/start.mjs`. The script opens the room in the default browser. The host sets a code word on that page. It is not saved. Everyone else types it at the door.

The room listens on `127.0.0.1` only. Other people cannot reach that address. For a link you can send, install Cloudflare’s tunnel tool and start the room again:

```
brew install cloudflared
```

If `cloudflared` is installed, the script runs `cloudflared tunnel --url http://127.0.0.1:PORT` and prints the public `trycloudflare.com` link. No Cloudflare account is required. There is no email list and no `--allowed-mail` gate. The host’s page shows that link beside the code word, with its own Copy button. Anyone with the link can open the room. The script does not open a mail draft. The code word is not part of the link.

The host sets a code word each time they start the room. It is held only in memory while the script is open, and it is not written to `data/config.json`. The script does not ask for colleague email addresses. An old `data/config.json` that still has addresses or a mailbox password is ignored for entry. Those addresses are not a guest list.

## How a chat-only person joins

Open this link. Nothing to install.

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
| `server.mjs` | The room. HTTP on `127.0.0.1`. Holds the live locked parcels in memory. No message database. |
| `public/index.html`, `public/app.js`, `public/app.css` | The page: door, the chat window, composer, Settings. |
| `public/popup.js` | Square windows over the world: drag by the bar, resize from the corner, minimise to the tray. Remembers only window layout in this browser. |
| `public/e2e.js` | Browser encryption. Web Crypto only. Keys stay in memory. |
| `public/whimsy.js`, `public/affirmations.js` | Disco cats, sequins and the disco light, the affirmation cat, and its lines. |
| `public/colosseum.js` | The town game: walking, Tab between chat and world, combat, NPC talk, place cards, the Colosseum window. Positions travel as locked game parcels. |
| `public/colosseum-logic.mjs` | Pure rules: coins, bets, shop, bag, home works, walking and walls, weapons and the lightsaber block, skill tree, friendship stages, the clue trail and the second planet gate. Tested. |
| `public/colosseum-world.mjs` | The maps: Lantern Moon town, the tavern, market, Mallow's house, observatory, old cinema, home station, and Velvet Reach. |
| `public/colosseum-story.mjs` | Every NPC line. Edit freely; only the text matters to the game. |
| `public/colosseum-art.js`, `public/colosseum.css` | Original pixel art drawn in code, and the game's HUD styles. |
| `test/colosseum.test.mjs` | `node --test test/colosseum.test.mjs`. |
| `public/paperclip.png` | The attach-button picture. Original file, background removed. |
| `stickers/` | Sticker art that ships with the app. Not anyone’s conversation. |
| `scripts/start.mjs` | Starts the server, opens the browser, and the public link when `cloudflared` exists. |
| `start-nook.command` | Mac double-click. |
| `start-nook.bat` | Windows double-click. |
| `data/` | Optional local config on the host laptop (`data/config.json` may hold a host name). Git-ignored. Not messages. |

## The world and the windows

The whole window is the world. It is a little retro sci-fi town on Lantern Moon, drawn as small original pixel sprites. Everyone is a space cat. Bad guys are alien space cats on the street.

The chat is a square window. Drag it by its bar, resize it from the corner, minimise it to the tray. Click it to type. Disco cats, Settings, the affirmation cat and the Colosseum are the same kind of window. Settings has "Put the windows back".

Tab pauses the world and puts you in the chat. Tab again, or a click on the world, goes back to playing. In the world, WASD or arrows walk and the mouse aims. Click fires. Hold for the rifle and the beam. Tap for the launcher, fireball and lightsaber. E talks or uses, and 1 to 5 pick from the item bar. A lightsaber tap raises the blade. It blocks a shot whose path crosses the blade.

Walk into a door to go inside. The tavern, market, Mallow's house, observatory, old cinema and the hab block (your home) are rooms. Other people in the room appear as sprites. NPCs are local to each browser.

Velvet Reach, the second planet, stays locked until you have three things. You need all three star chart pieces (found with items you already carry). Mallow must count you as a close friend. You need a Moon rock from your own mine, and 60 coins for the fare.

Pixel bits when an alien pops are off by default. Settings has a gauge from None to Messy. It is a game effect only and never goes into the chat.

Game progress, the picture and the window layout stay in this browser. Nothing from the game is written on the host, and no chat is ever saved.

## Encryption

Each browser makes an ECDH P-256 key pair in memory when someone comes in. The private key is not extractable and is never written to disk, `localStorage`, or `IndexedDB`. The first person creates an AES-GCM room key and locks a copy to each person’s public key. Later arrivals are given a locked copy by someone who already has the room key. The page says when that happens. Compare the fingerprint on screen. If the fingerprints differ, you are not in the same locked room.

Text, sticker choice, and file bytes are encrypted in the browser before they are sent. The server stores ciphertext, public keys, and wrapped room keys. It does not store file names. A note that is posted twice is rejected. A note whose locked contents name a different sender is dropped.

Limits that stay, because this laptop serves the page:

- That laptop supplies the page, so only start it from the script you trust.
- The host and Cloudflare can see who is here and roughly how big a message is, not the words.
- People should compare the fingerprint on screen.

This is not a Signal-style protocol. There is no separate identity key and no double ratchet.

## What not to commit

`data/` is git-ignored, including `data/config.json`. Do not commit a mailbox password, a room word, `.env` files, or anything from a live chat. Chat is not written to disk by the app. If you copy a transcript yourself, keep that file out of git.

Do not put patient details, NHIs, or claim numbers in the room.
