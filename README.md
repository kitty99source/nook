# The Nook

The Nook is one chat room in the browser. It exists only on the laptop that starts it, and only while that script is still open. Close the script and the room is gone.

Messages are not saved. They stay in memory as locked parcels so the people in the room can read them while it is open. **Copy chat** and **Save to note** are the only ways a transcript leaves, and only because that person asked.

Colleagues who only chat do not install git, Node, or this app. They open a URL.

## Who does what

**Host.** Prakriti, or whoever is running the room, double-clicks the start script on their laptop. The script opens the room in their browser and prints a link. They copy that link to anyone who should join. They are the person who closes the room. Closing the terminal, or Ctrl+C, stops the chat for everyone.

**Chat-only person.** Open the link in a browser. Nothing to install. The door asks what to call you. If a room word is set, type it. If the room word box says you can leave it blank, leave it blank and come in.

**Coder.** Prakriti adds you as a collaborator on this private GitHub repo when you should edit the code. Then clone it, install Node 24, and run the start script. You do not need to be a collaborator just to chat.

## How to run it

Needs Node 24. No install step and no build step.

On a Mac, double-click `start-nook.command`.

On Windows, double-click `start-nook.bat`.

Both run `scripts/start.mjs`. The script opens `http://127.0.0.1:<port>` in the default browser. If a room word is in use (`NOOK_ROOM_WORD`), that local page is given the word once, then the word is removed from the address bar.

The room listens on `127.0.0.1` only. Other people cannot reach that address. For a link you can send, install Cloudflare’s tunnel tool and start the room again:

```
brew install cloudflared
```

If `cloudflared` is on the PATH, the script runs `cloudflared tunnel --url http://127.0.0.1:PORT` and prints the public `trycloudflare.com` link. There is no email list and no `--allowed-mail` gate. Anyone with the link can open the room. The script does not open a mail draft.

A room word is optional. Set `NOOK_ROOM_WORD` before starting if you want the door to require one. Leave it unset and the door can be left blank. The script does not ask for colleague email addresses. An old `data/config.json` that still has addresses or a mailbox password is ignored for entry. Those addresses are not a guest list.

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
| `public/index.html`, `public/app.js`, `public/app.css` | The page: door, chat card, composer, disco, affirmation cat, paperclip. |
| `public/e2e.js` | Browser encryption. Web Crypto only. Keys stay in memory. |
| `public/whimsy.js`, `public/affirmations.js` | Side-lane cats and the affirmation lines. |
| `public/paperclip.png` | The attach-button picture. Original file, background removed. |
| `stickers/` | Sticker art that ships with the app. Not anyone’s conversation. |
| `scripts/start.mjs` | Starts the server, opens the browser, and the public link when `cloudflared` exists. |
| `start-nook.command` | Mac double-click. |
| `start-nook.bat` | Windows double-click. |
| `data/` | Optional local config on the host laptop (`data/config.json` may hold a host name). Git-ignored. Not messages. |

`Disco` and `Affirmation cat` sit beside Copy chat. The cat and the disco scene open in the spare space beside the chat card, not over the messages. Each can be minimised to a small tab on the side and opened again. Click the affirmation cat picture for another line. Hover Attach and the paperclip peeks out. It hides when Attach is clicked.

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
