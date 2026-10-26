# Desktop Microduck 🦆

A little flock of robot ducks that lives on your Mac desktop — up to five, one in each colour. They wander around on their own, step aside when they meet, sit down for a rest, look around, kick a ball, pick up blocks with their beaks, put on roller skates and quack — every duck has its own voice.

It is drawn in the hand-inked [Colorfigures](https://april-zhu.com/colorfigures) style and modelled part by part on [Microduck](https://github.com/pollen-robotics), the 25 cm open-source walking robot duck from Pollen Robotics / Hugging Face. Turn on **See-through** to watch its 15 motors, main board and balance sensors work while it walks.

> Unofficial fan project. Microduck's name and design belong to Pollen Robotics.

## Two ways to play

- **Desktop pets** (Mac app): a flock of ducks wandering over your desktop. See *Install* below.
- **Play, Inside and Build** (web page, any computer or phone): one big duck you can drive, open up chapter by chapter, and take apart and build step by step. Download [`web/index.html`](web/index.html) and open it in your browser. It is one self-contained file and works offline, nothing to install.

## Install the desktop pets

1. Download the zip for your Mac from [Releases](../../releases):
   - **Apple Silicon** (M1, M2, M3, M4…): `Desktop-Microduck-mac-apple-silicon.zip`
   - **Intel**: `Desktop-Microduck-mac-intel.zip`
2. Unzip it and drag **Desktop Microduck** into your Applications folder.
3. Open it. The app isn't signed with an Apple developer certificate, so macOS stops it the first time:
   - **macOS 15 Sequoia or newer:** click *Done*, open **System Settings → Privacy & Security**, scroll down and click **Open Anyway** next to Desktop Microduck, then confirm.
   - **macOS 14 or older:** right-click the app → **Open** → **Open**.

You only need to do this once.

## Playing with it

| | |
|---|---|
| **Click** the duck | it quacks or does a little trick |
| **Drag** the duck | pick it up and put it somewhere else |
| **Right-click** a duck | walk, turn, sit, crouch, kick, pick up a block, roller skates, look around, quack, see-through, its colour |
| **Menu bar** duck icon | everyone quacks / looks around / goes see-through at once; how many ducks (1–5), size, sound, *Wander on their own* and *Quit* |

If a duck ever gets lost, choose **Bring the ducks back** from the menu bar icon.

## How it was made

The duck is a single interactive Colorfigures page (`tools/figure.html`) built with Claude and the Colorfigures skill: every part is drawn from the real robot's published specs (14 Dynamixel XL330 joint servos plus the beak, a Rockchip RK3566 main board, two IMUs, a camera, an 8×8 time-of-flight sensor and an NP-F550 battery), and every move is animated joint by joint. Where parts sit inside the shell is an illustration, not a CAD copy.

`app/pet.js` turns that page into a desk pet: it hides everything except the duck, draws up to five of them, and gives each one a small brain (stroll, turn away from the screen edges and from other ducks, rest, play), and handles clicks, carrying and menus. `app/main.js` is a tiny [Electron](https://www.electronjs.org) shell: one transparent, always-on-top window over the screen that lets clicks pass through everywhere except the duck.

## Build it yourself

Needs Node.js 20+.

```bash
npm install
npm run page      # rebuilds app/duck.html from tools/figure.html + the pet layer
npm start         # runs the duck from source
npm run package   # makes dist/…-darwin-arm64 and dist/…-darwin-x64
```

The web page in `web/index.html` is the same figure as `tools/figure.html`; edit one and copy it over the other.

On a Mac you can sign the result ad hoc with `codesign --force --deep -s - "Desktop Microduck.app"` (elsewhere, [rcodesign](https://github.com/indygreg/apple-platform-rs) does the same).

## Credits and licence

- Duck design and name: **Microduck** by Pollen Robotics / Hugging Face. This project is not affiliated with them.
- Drawing style and figure engine: **Colorfigures** by April Zhu, MIT licence.
- This app: MIT licence (see `LICENSE`).
