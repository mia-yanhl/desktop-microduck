# Builds app/duck.html: the Colorfigures Microduck page with the desktop-pet layer added at the end.
import sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'tools' / 'figure.html').read_text()
i = src.rindex('</body>')
# the pet takes longer strides than the figure page, so let it change STRIDE
assert 'const STRIDE = 13' in src
src = src.replace('const STRIDE = 13', 'let STRIDE = 13', 1)
# several ducks share one page: the moves, the ball and the voice follow the duck they were given, not ui.st
PATCHES = [
    ("function run(){\n  const st = ui.st; if (st.running) return;", "function run(st = ui.st){\n  if (st.running) return;"),
    ("st.queue.push(...moves); run(); }", "st.queue.push(...moves); run(st); }"),
    ("function rollBall(){ const st = ui.st;", "function rollBall(st = ui.st){"),
    ("st.ball.v = 280; st.ball.rest = 0; rollBall(); }", "st.ball.v = 280; st.ball.rest = 0; rollBall(st); }"),
    ("const VOICE = { f:", "const VOICE0 = { f:"),
    ("function quackSound(n = 2){ try {", "function quackSound(n = 2, who){ const VOICE = (who && who.voice) || VOICE0; try {"),
    ("quackSound(full ? 1 : 2);", "quackSound(full ? 1 : 2, st);"),
]
for a, b in PATCHES:
    assert src.count(a) == 1, a
    src = src.replace(a, b)
i = src.rindex('</body>')
out = src[:i] + '<link rel="stylesheet" href="pet.css"><script src="pet.js"></script>\n' + src[i:]
(root / 'app' / 'duck.html').write_text(out)
print('wrote', root / 'app' / 'duck.html', len(out))
