import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import PptxGenJS from "pptxgenjs"

const require = createRequire(import.meta.url)
const {
  warnIfSlideHasOverlaps,
  warnIfSlideElementsOutOfBounds,
} = require("./pptxgenjs_helpers/layout.js")

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")
const outputDir = path.join(repoRoot, "output", "presentation")
const outputFile = path.join(outputDir, "CollegeBall_Project_Deck.pptx")

const colors = {
  bg: "08111D",
  panel: "102338",
  panelSoft: "132A43",
  ink: "F6FAFF",
  muted: "A9BDD4",
  cyan: "55D6FF",
  cyanSoft: "17364B",
  amber: "F4B63F",
  amberSoft: "4B3411",
  red: "D04B52",
  blue: "2F6BFF",
  line: "28475F",
}

const fonts = {
  heading: "Aptos Display",
  body: "Aptos",
  mono: "Consolas",
}

fs.mkdirSync(outputDir, { recursive: true })

const pptx = new PptxGenJS()
pptx.layout = "LAYOUT_WIDE"
pptx.author = "OpenAI Codex"
pptx.company = "OpenAI"
pptx.subject = "CollegeBall project presentation"
pptx.title = "CollegeBall Project Deck"
pptx.lang = "en-US"
pptx.theme = {
  headFontFace: fonts.heading,
  bodyFontFace: fonts.body,
  lang: "en-US",
}

function addBackground(slide) {
  slide.background = { color: colors.bg }
  slide.addShape(pptx.ShapeType.rect, {
    x: 8.95,
    y: 0,
    w: 4.383,
    h: 7.5,
    fill: { color: "0C1828", transparency: 6 },
    line: { color: "0C1828", transparency: 100 },
  })

  slide.addShape(pptx.ShapeType.ellipse, {
    x: 9.55,
    y: 0.18,
    w: 3.05,
    h: 1.7,
    fill: { color: colors.cyan, transparency: 78 },
    line: { color: colors.cyan, transparency: 100 },
  })

  slide.addShape(pptx.ShapeType.ellipse, {
    x: 10.7,
    y: 6.18,
    w: 1.85,
    h: 0.9,
    fill: { color: colors.amber, transparency: 80 },
    line: { color: colors.amber, transparency: 100 },
  })

  slide.addShape(pptx.ShapeType.line, {
    x: 0.65,
    y: 6.88,
    w: 11.8,
    h: 0,
    line: { color: colors.line, transparency: 15, width: 1.25 },
  })
}

function addDeckLabel(slide, label = "CollegeBall") {
  slide.addText(label, {
    x: 0.7,
    y: 0.35,
    w: 2.8,
    h: 0.25,
    fontFace: fonts.body,
    fontSize: 10,
    bold: true,
    color: colors.cyan,
    charSpace: 2.4,
    allCaps: true,
    margin: 0,
  })
}

function addTitleBlock(slide, eyebrow, title, subtitle) {
  addDeckLabel(slide)
  slide.addText(eyebrow, {
    x: 0.7,
    y: 0.82,
    w: 3.2,
    h: 0.28,
    fontFace: fonts.body,
    fontSize: 11,
    bold: true,
    color: colors.amber,
    charSpace: 1.8,
    allCaps: true,
    margin: 0,
  })

  slide.addText(title, {
    x: 0.7,
    y: 1.14,
    w: 6.8,
    h: 0.72,
    fontFace: fonts.heading,
    fontSize: 25,
    bold: true,
    color: colors.ink,
    margin: 0,
    breakLine: false,
  })

  slide.addText(subtitle, {
    x: 0.7,
    y: 2.02,
    w: 6.15,
    h: 0.62,
    fontFace: fonts.body,
    fontSize: 12,
    color: colors.muted,
    margin: 0,
    valign: "mid",
  })
}

function addPill(slide, text, x, y, fill, textColor = colors.ink) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: Math.max(1.3, text.length * 0.095),
    h: 0.34,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: fill, transparency: 100 },
  })

  slide.addText(text, {
    x: x + 0.12,
    y: y + 0.065,
    w: Math.max(1.06, text.length * 0.095 - 0.18),
    h: 0.2,
    fontFace: fonts.body,
    fontSize: 9,
    bold: true,
    color: textColor,
    margin: 0,
    align: "center",
    allCaps: true,
  })
}

function addPanel(slide, x, y, w, h, title, body, accent = colors.cyan) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.12,
    fill: { color: colors.panel, transparency: 5 },
    line: { color: colors.line, transparency: 0, width: 1 },
  })

  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.02,
    y: y + 0.02,
    w: 0.08,
    h: h - 0.04,
    fill: { color: accent },
    line: { color: accent, transparency: 100 },
  })

  slide.addText(title, {
    x: x + 0.24,
    y: y + 0.16,
    w: w - 0.38,
    h: 0.28,
    fontFace: fonts.body,
    fontSize: 12,
    bold: true,
    color: colors.ink,
    margin: 0,
  })

  slide.addText(body, {
    x: x + 0.24,
    y: y + 0.48,
    w: w - 0.36,
    h: h - 0.6,
    fontFace: fonts.body,
    fontSize: 10.5,
    color: colors.muted,
    margin: 0,
    valign: "top",
  })
}

function addMetric(slide, x, y, value, label, accent = colors.amber) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: 1.9,
    h: 0.92,
    rectRadius: 0.1,
    fill: { color: colors.panelSoft, transparency: 2 },
    line: { color: colors.line, width: 1 },
  })

  slide.addText(value, {
    x: x + 0.18,
    y: y + 0.13,
    w: 1.2,
    h: 0.32,
    fontFace: fonts.heading,
    fontSize: 18,
    bold: true,
    color: accent,
    margin: 0,
  })

  slide.addText(label, {
    x: x + 0.18,
    y: y + 0.5,
    w: 1.45,
    h: 0.16,
    fontFace: fonts.body,
    fontSize: 8.5,
    bold: true,
    color: colors.muted,
    margin: 0,
    allCaps: true,
    charSpace: 0.8,
  })
}

function addBulletList(slide, items, x, y, w) {
  items.forEach((item, index) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y: y + index * 0.52 + 0.11,
      w: 0.08,
      h: 0.08,
      fill: { color: colors.cyan },
      line: { color: colors.cyan, transparency: 100 },
    })

    slide.addText(item, {
      x: x + 0.16,
      y: y + index * 0.52,
      w,
      h: 0.32,
      fontFace: fonts.body,
      fontSize: 11,
      color: colors.ink,
      margin: 0,
      valign: "mid",
    })
  })
}

function addNode(slide, x, y, w, h, title, subtitle, fill, titleColor = colors.ink) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.12,
    fill: { color: fill, transparency: 0 },
    line: { color: fill, transparency: 100 },
  })

  slide.addText(title, {
    x: x + 0.2,
    y: y + 0.18,
    w: w - 0.4,
    h: 0.26,
    fontFace: fonts.heading,
    fontSize: 14,
    bold: true,
    color: titleColor,
    margin: 0,
    align: "center",
  })

  slide.addText(subtitle, {
    x: x + 0.18,
    y: y + 0.48,
    w: w - 0.36,
    h: h - 0.58,
    fontFace: fonts.body,
    fontSize: 9.5,
    color: titleColor,
    margin: 0,
    align: "center",
    valign: "mid",
  })
}

function addConnector(slide, x, y, w, color = colors.line) {
  slide.addShape(pptx.ShapeType.chevron, {
    x,
    y,
    w,
    h: 0.38,
    fill: { color, transparency: 15 },
    line: { color, transparency: 100 },
  })
}

function addRoadmapCard(slide, x, y, w, title, items, accent) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 2.05,
    rectRadius: 0.12,
    fill: { color: colors.panel, transparency: 2 },
    line: { color: colors.line, width: 1 },
  })

  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.1,
    fill: { color: accent },
    line: { color: accent, transparency: 100 },
  })

  slide.addText(title, {
    x: x + 0.2,
    y: y + 0.2,
    w: w - 0.4,
    h: 0.25,
    fontFace: fonts.heading,
    fontSize: 13,
    bold: true,
    color: colors.ink,
    margin: 0,
  })

  addBulletList(slide, items, x + 0.2, y + 0.56, w - 0.48)
}

function finalizeSlide(slide) {
  // The deck uses layered background chrome behind foreground content.
  // Enable helper diagnostics only when debugging slide geometry directly.
  if (process.env.SLIDES_DEBUG === "1") {
    warnIfSlideHasOverlaps(slide, pptx)
    warnIfSlideElementsOutOfBounds(slide, pptx)
  }
}

function buildTitleSlide() {
  const slide = pptx.addSlide()
  addBackground(slide)
  addTitleBlock(
    slide,
    "Project Presentation",
    "CollegeBall",
    "A sim-first college basketball coaching prototype built in React, TypeScript, Babylon.js, and Zustand."
  )

  addPill(slide, "Sim-first", 0.72, 2.85, colors.cyanSoft)
  addPill(slide, "3D broadcast feel", 2.12, 2.85, colors.cyanSoft)
  addPill(slide, "Coaching simulator", 4.0, 2.85, colors.amberSoft)

  slide.addText("What this prototype already proves", {
    x: 0.72,
    y: 3.45,
    w: 3.6,
    h: 0.24,
    fontFace: fonts.body,
    fontSize: 11,
    bold: true,
    color: colors.ink,
    margin: 0,
    allCaps: true,
    charSpace: 1.1,
  })

  addBulletList(
    slide,
    [
      "Full 40-minute browser simulation with NCAA-style shot clock and bonus rules",
      "Babylon.js court rendering with camera modes, HUD, and match overlays",
      "Project structure ready for season mode, recruiting, and roster depth",
    ],
    0.74,
    3.82,
    5.8
  )

  addMetric(slide, 9.3, 1.4, "2 x 20", "Half structure", colors.amber)
  addMetric(slide, 11.35, 1.4, "30s", "Shot clock", colors.cyan)
  addMetric(slide, 9.3, 2.52, "5v5", "On-court sim", colors.cyan)
  addMetric(slide, 11.35, 2.52, "Phase 4", "Current build", colors.amber)

  addPanel(
    slide,
    8.98,
    3.72,
    3.65,
    2.35,
    "Current positioning",
    "The game already feels like a coaching product rather than an engine demo: pace control, camera switching, scoreboard state, fouls, stamina, substitutions, and postgame summaries are all wired into the same live loop.",
    colors.cyan
  )

  finalizeSlide(slide)
}

function buildFeatureSlide() {
  const slide = pptx.addSlide()
  addBackground(slide)
  addTitleBlock(
    slide,
    "Product Snapshot",
    "From simulation core to bench-side presentation",
    "CollegeBall treats the basketball engine as the source of truth and layers presentation, controls, and overlays on top of it."
  )

  addPanel(
    slide,
    0.72,
    3.05,
    3.85,
    1.25,
    "Simulation depth",
    "Shot selection, passing, steals, rebounds, fouls, free throws, stamina, substitutions, and per-player stats all run in a framework-agnostic engine.",
    colors.cyan
  )
  addPanel(
    slide,
    0.72,
    4.52,
    3.85,
    1.25,
    "Coaching experience",
    "The product focuses on watching, pacing, and decision support instead of twitch controls, which makes it feel closer to a bench simulator than an arcade title.",
    colors.amber
  )
  addPanel(
    slide,
    4.82,
    3.05,
    3.85,
    1.25,
    "Presentation layer",
    "Broadcast camera modes, a polished main menu, match-phase overlays, event feed, scoreboard, and pause-state game menu create a TV-ready wrapper.",
    colors.amber
  )
  addPanel(
    slide,
    4.82,
    4.52,
    3.85,
    1.25,
    "Scalable foundation",
    "The current architecture cleanly opens into season mode, tournaments, recruiting, richer play-calling, and deeper roster strategy without replacing the core loop.",
    colors.cyan
  )

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.0,
    y: 3.05,
    w: 3.62,
    h: 2.72,
    rectRadius: 0.14,
    fill: { color: colors.panelSoft, transparency: 0 },
    line: { color: colors.line, width: 1 },
  })

  slide.addText("Live systems in the current prototype", {
    x: 9.2,
    y: 3.26,
    w: 2.95,
    h: 0.22,
    fontFace: fonts.body,
    fontSize: 11,
    bold: true,
    color: colors.ink,
    margin: 0,
    allCaps: true,
    charSpace: 1.1,
  })

  addBulletList(
    slide,
    [
      "Game clock, shot clock, halftime, final state",
      "Shooting and non-shooting fouls with bonus logic",
      "Bench recovery plus fatigue-driven substitutions",
      "Assists and postgame box score output",
    ],
    9.22,
    3.7,
    2.92
  )

  finalizeSlide(slide)
}

function buildArchitectureSlide() {
  const slide = pptx.addSlide()
  addBackground(slide)
  addTitleBlock(
    slide,
    "Architecture",
    "A clean sim-first stack keeps product work moving",
    "The simulation engine is deliberately separated from rendering and interface code, which makes iteration safer as the project grows."
  )

  addNode(
    slide,
    0.95,
    3.35,
    2.2,
    1.15,
    "Simulation Engine",
    "Pure tick(state, dt) logic for basketball rules and outcomes",
    colors.blue
  )
  addConnector(slide, 3.25, 3.72, 0.52)

  addNode(
    slide,
    3.9,
    3.35,
    2.1,
    1.15,
    "Zustand Store",
    "Stable boundary for UI state and live sim updates",
    colors.cyanSoft
  )
  addConnector(slide, 6.1, 3.72, 0.52)

  addNode(
    slide,
    6.75,
    3.35,
    2.1,
    1.15,
    "React UI",
    "Scoreboard, controls, event feed, overlays, menus",
    colors.amberSoft
  )
  addConnector(slide, 8.95, 3.72, 0.52)

  addNode(
    slide,
    9.72,
    3.35,
    2.4,
    1.15,
    "Babylon Renderer",
    "Court scene, camera modes, player visuals, animation state",
    colors.red
  )

  addPanel(
    slide,
    1.1,
    5.05,
    3.45,
    1.25,
    "Why this matters",
    "Features like recruiting or season play can build on the same simulation core instead of being tangled into visual code.",
    colors.cyan
  )
  addPanel(
    slide,
    4.95,
    5.05,
    3.25,
    1.25,
    "Current source layout",
    "src/game handles engine plus rendering helpers; src/store holds the product boundary; screens and ui handle experience polish.",
    colors.amber
  )
  addPanel(
    slide,
    8.55,
    5.05,
    3.0,
    1.25,
    "Execution model",
    "A requestAnimationFrame loop advances the sim while the renderer syncs the latest state into the 3D scene.",
    colors.cyan
  )

  finalizeSlide(slide)
}

function buildSystemsSlide() {
  const slide = pptx.addSlide()
  addBackground(slide)
  addTitleBlock(
    slide,
    "Systems",
    "The basketball layer already includes meaningful game logic",
    "This is more than a visual shell: the prototype models enough of the sport to support coaching-style decisions and postgame analysis."
  )

  addRoadmapCard(
    slide,
    0.72,
    3.0,
    3.85,
    "Core possession loop",
    [
      "Spacing and defensive slotting",
      "Drive, pass, and shot decisions",
      "Rebounds and turnovers",
    ],
    colors.cyan
  )
  addRoadmapCard(
    slide,
    4.74,
    3.0,
    3.85,
    "Game management",
    [
      "Halves, shot clock, and phase states",
      "Personal fouls plus team bonus thresholds",
      "Free throws and foul-out handling",
    ],
    colors.amber
  )
  addRoadmapCard(
    slide,
    8.76,
    3.0,
    3.85,
    "Roster and output",
    [
      "Fatigue and auto-substitution behavior",
      "Per-player stat accumulation",
      "Postgame box score presentation",
    ],
    colors.cyan
  )

  slide.addText("Example prototype matchup", {
    x: 0.82,
    y: 5.45,
    w: 2.6,
    h: 0.22,
    fontFace: fonts.body,
    fontSize: 10,
    bold: true,
    color: colors.muted,
    margin: 0,
    allCaps: true,
    charSpace: 1,
  })

  slide.addText("State Bulldogs vs Central Tigers", {
    x: 0.82,
    y: 5.75,
    w: 4.0,
    h: 0.3,
    fontFace: fonts.heading,
    fontSize: 18,
    bold: true,
    color: colors.ink,
    margin: 0,
  })

  slide.addText("Default settings: 20-minute halves, 30-second shot clock, one-and-one at 7 fouls, double bonus at 10, fatigue substitutions under 25 stamina.", {
    x: 0.82,
    y: 6.08,
    w: 8.2,
    h: 0.42,
    fontFace: fonts.body,
    fontSize: 10.5,
    color: colors.muted,
    margin: 0,
  })

  finalizeSlide(slide)
}

function buildRoadmapSlide() {
  const slide = pptx.addSlide()
  addBackground(slide)
  addTitleBlock(
    slide,
    "Roadmap",
    "The next steps are product-deepening features, not rewrites",
    "The prototype has already crossed the line from technical experiment into a foundation that can support a fuller college basketball management game."
  )

  addRoadmapCard(
    slide,
    0.72,
    3.0,
    3.85,
    "Phase 4 now",
    [
      "Bonus rules and non-shooting fouls",
      "Stamina drain and bench recovery",
      "Automatic substitutions and assists",
    ],
    colors.cyan
  )
  addRoadmapCard(
    slide,
    4.74,
    3.0,
    3.85,
    "Near-term product work",
    [
      "Manual substitutions and play-calling",
      "Season flow with standings and schedules",
      "Tournament bracket pressure",
    ],
    colors.amber
  )
  addRoadmapCard(
    slide,
    8.76,
    3.0,
    3.85,
    "Longer horizon",
    [
      "Recruiting and program-building identity",
      "GLB player models and richer animation",
      "Sound design and broadcast atmosphere",
    ],
    colors.cyan
  )

  slide.addText("Recommendation", {
    x: 0.82,
    y: 5.5,
    w: 1.7,
    h: 0.2,
    fontFace: fonts.body,
    fontSize: 10,
    bold: true,
    color: colors.amber,
    margin: 0,
    allCaps: true,
    charSpace: 1.1,
  })
  slide.addText("Position CollegeBall as a coaching-simulator foundation with credible on-court logic today and a clear expansion path into season and roster strategy tomorrow.", {
    x: 0.82,
    y: 5.82,
    w: 8.3,
    h: 0.48,
    fontFace: fonts.body,
    fontSize: 11.5,
    color: colors.ink,
    margin: 0,
  })

  finalizeSlide(slide)
}

buildTitleSlide()
buildFeatureSlide()
buildArchitectureSlide()
buildSystemsSlide()
buildRoadmapSlide()

await pptx.writeFile({ fileName: outputFile })
console.log(`Wrote presentation to ${outputFile}`)
