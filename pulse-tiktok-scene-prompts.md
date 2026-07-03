# PULSE — TikTok-Style Scene Prompts (Round 3: Continuous Sequence)

10 scenes, landscape **16:9**, now written as **one continuous story** instead of 10 standalone clips — a player arc (1-5) that flows shot-to-shot, then a smooth bridge into a football-alone arc (6-10) that also flows shot-to-shot. Each prompt states exactly what the previous shot ends on and what this shot must open on, so — even though you're generating each one separately — they line up as cuts in a single sequence rather than a grab-bag of clips. No environment/set description baked in beyond what's needed for continuity; your own reference setup fills in the rest.

**How to use the continuity notes:** every scene below has an *Entry* line (what the first frame must match, for a clean cut from the previous clip) and an *Exit* line (what the last frame must land on, so the next clip's Entry lines up). Generate them in order, and trim each clip right at the described Entry/Exit frame when you edit them together.

**Style notes carried through every prompt:**
- Landscape **16:9** framing throughout.
- Punchy motion: speed-ramps (slow-mo into a snap of real-time), whip-pans, snap-zooms.
- Rim/key lighting language only ("dramatic rim light," "hard key light," "glossy reflections") — no "dark," "void," or "studio" callouts.
- Same accent palette as the site for anything cut in together: cyan `#22d3ee`, violet `#8b5cf6`, pink `#f472b6`.

---

## A. Player arc (one continuous sequence)

**1. Stadium Dive → Boot-Cam Strike**
- *Image prompt:* A single football stadium seen from directly overhead, camera looking straight down at the pitch far below, one anonymous player standing over a football near the center circle, tiny from this height, dramatic overhead light raking across the grass, 16:9.
- *Video prompt:* Camera opens looking straight down on the stadium from high overhead, then dives and zooms continuously toward the pitch, accelerating down past the stands and onto the grass until it swoops into a first-person boot-cam angle right at the player's foot — no cut, one unbroken dive-and-zoom — arriving just as the boot is about to strike the ball, then the boot connects and the ball rockets away in a burst of motion blur, speed-ramping from the slow aerial descent into a hard snap of real-time on impact. 16:9, 6-8 seconds. *Exit: ball just launched off the boot, rocketing out of frame, heavy motion blur trailing it.*

**2. Freeze & Flex Celebration**
- *Video prompt:* Continues directly off the departing ball's motion blur — camera whip-pans off the blur trail and lands on the same anonymous player already sliding into a knee celebration, strong backlight silhouetting them, dust and grass kicking up around the slide. Motion freeze-frames for a beat (built-in pause for a caption/stat overlay), then snaps back to real-time as the player rises and the football rolls back toward their feet, settling right at their boot. 16:9, 5-6 seconds. *Entry: whip-pan off scene 1's motion-blur exit. Exit: ball comes to rest at the player's feet, camera settled and steady.*
- *Image prompt:* Wide shot of the anonymous player mid-slide celebration, knee on the grass, arms out, strong backlight silhouette, football rolling into frame toward their feet, dust hanging in the air, no visible face.

**3. Juggle Combo Loop**
- *Video prompt:* Continues directly from the ball settling at the player's feet — camera pushes into a tight crop on just the feet and lower legs as they begin juggling, a clean glossy highlight glinting off the ball with every touch, rhythm building smoothly. On the final touch, the player flicks the ball sharply upward, out of the tight crop, camera tilting up to follow it rising into the air. 16:9, 5-6 seconds. *Entry: tight crop opens on the ball already resting at the feet from scene 2's exit. Exit: ball flicked high into the air, camera tilted upward tracking it, still rising.*
- *Image prompt:* Tight crop on an anonymous player's feet and lower legs juggling a football, ball frozen mid-bounce off the laces, glossy highlight on the ball's surface, minimal and clean despite being a person.

**4. Nutmeg Trick Reveal**
- *Video prompt:* Camera is still tracking upward from the flicked ball at the top of frame — it arcs back down, and as it descends, whip-pans and snap-zooms into a low angle just as the ball threads between the same player's legs in a nutmeg move, an opposing player's silhouette blurred in the background. A quick freeze-flash and radial light burst mark the payoff frame, then the ball pops out the other side and rolls forward into open space ahead of the player. 16:9, 4-5 seconds. *Entry: the descending ball from scene 3's exit. Exit: ball rolling forward into open space, player already moving to chase it, camera pulling back and up.*
- *Image prompt:* Low-angle shot of a football caught mid-flight between an anonymous player's open legs, an opposing player's silhouette blurred behind, dramatic rim light outlining the ball, dust particles in the air, dynamic diagonal composition, no visible faces.

**5. Slo-Mo Diving Volley → Launch**
- *Video prompt:* Continues as the camera pulls back to a dramatic side angle — the ball rolling forward from scene 4 is met mid-air by the same player launching into a full horizontal dive to volley it, water droplets exploding off the ball at the exact moment of contact (wet pitch), dramatic side key light. The struck ball then rockets away from the player and up out of the stadium bowl, camera holding on it in slow motion as it climbs, the stands and pitch falling away and blurring into streaks of motion behind it, light gradually wrapping the ball in a soft glow as it leaves the "sports" world behind. 16:9, 6-7 seconds. *Entry: ball rolling forward from scene 4's exit, player already diving toward it. Exit: ball flying alone in soft glowing light, stadium fully blurred away behind it — this is the bridge into the football-alone arc.*
- *Image prompt:* Dramatic side-angle shot of an anonymous player fully airborne mid-volley, body horizontal, boot connecting with the football, water droplets frozen mid-air, high-contrast single key light, ultra-high-speed-camera look.

---

### TRANSITION BRIDGE (player → football-alone)
Scene 5 ends with the ball flying alone, glowing, background dissolved into motion-blur streaks — deliberately written so it can hand off into Scene 6 with a single match-cut: the camera holds on the same airborne ball, its speed bleeds off, and it comes to rest hovering in place as the glow around it resolves into the holographic rings that open Scene 6. If your generator supports image-to-video continuation, feed the last frame of Scene 5 in as the reference/first frame for Scene 6 — that's the cleanest way to make the hand-off invisible.

---

## B. Football-alone arc (one continuous sequence, single + multiple)

**6. Single Ball — Levitating Hero (transition payoff)**
- *Video prompt:* Continues directly from the airborne ball's momentum bleeding off — it decelerates smoothly until it hangs motionless, slowly rotating in place, thin holographic rings of cyan-violet-pink light resolving into existence and orbiting around it at different speeds, a glossy reflective surface beneath mirroring the ball, dust motes drifting through soft light beams. Camera does a slow 180-degree orbit around the now-settled ball. 16:9, 5-6 seconds. *Entry: the decelerating glowing ball from scene 5's exit. Exit: camera orbit completing, settling into a close three-quarter view of the ball's surface.*
- *Image prompt:* A single football hanging motionless in mid-air, thin glowing holographic rings of cyan-violet-pink light orbiting around it, soft volumetric light beams through fine drifting dust, glossy reflective surface beneath doubling the ball, premium product-photography lighting.

**7. Single Ball — Cracked Energy Core**
- *Video prompt:* Continues the push-in from scene 6's closing three-quarter view — camera keeps pushing until it's an extreme macro shot of one panel, where a single glowing crack forms and splits open, brilliant cyan-violet energy pulsing and leaking out like molten light, each pulse brighter than the last until a final bright flash fully breaks through the surface. 16:9, 4-5 seconds. *Entry: continuous push-in from scene 6's ending framing. Exit: bright flash fully overexposing the frame — the whiteout is the transition device into scene 8.*
- *Image prompt:* Extreme macro close-up of a football's surface with a single glowing crack splitting across a panel, brilliant cyan-violet energy pulsing and leaking out like molten light, dust suspended in the beam, ultra shallow depth of field, satisfying macro leather-grain detail.

**8. Multiple Balls — Synchronized Orbit Array**
- *Video prompt:* Opens on the same overexposed whiteout from scene 7, which resolves as the light fades to reveal the single ball is now one of several, all arranged in a perfect ring and orbiting together around a shared center point like a kinetic sculpture, each spinning on its own axis, rim-lit in glowing violet light, glossy reflection beneath. The whole array gradually speeds up until it blurs into a solid glowing ring. 16:9, 5-6 seconds. *Entry: whiteout from scene 7 resolving into the revealed array. Exit: array blurred into a glowing ring, spinning fast.*
- *Image prompt:* A tight formation of several footballs arranged in a perfect ring, frozen mid-rotation around a shared center point like a kinetic sculpture, each ball catching a rim of glowing violet light, glossy reflective surface beneath, symmetrical hyper-clean composition.

**9. Multiple Balls — Domino Wave Bounce**
- *Video prompt:* Continues as the blurred glowing ring from scene 8 slows and drops, the balls settling out of their orbit into a straight row on a glossy reflective surface — motion smoothly converting from circular to linear. Once settled, a traveling wave pattern runs down the line, the middle ball bouncing higher than the rest, each bounce leaving a brief streak of cyan light, the wave accelerating on a second pass. 16:9, 5-6 seconds. *Entry: the spinning ring from scene 8 dropping and unspooling into a row. Exit: all balls freezing mid-air simultaneously at the peak of a bounce.*
- *Image prompt:* A straight row of footballs on a glossy reflective surface, the middle ball caught mid-bounce higher than the rest in a traveling wave pattern, each ball trailing a faint streak of cyan light, clean symmetrical side angle.

**10. Single Ball — Elemental Split-Screen (finale)**
- *Video prompt:* Continues from the frozen mid-air row — every ball but the center one fades away as the camera pushes in on it, this last remaining ball now hanging alone and slowly rotating, one half igniting into flickering orange flame and the other half crackling with cyan-white electricity, the two elements never mixing as it turns, embers and sparks drifting off each half. Camera holds a slow push-in for the full shot, ending on a clean loopable frame that can cut straight back to the ring in scene 8 if you want the whole football-alone arc to repeat. 16:9, 5-6 seconds. *Entry: the frozen row from scene 9, all but one ball fading out. Exit: full elemental ball, symmetrical and centered — designed to loop.*
- *Image prompt:* A single football centered in frame, perfectly split down the middle: one half wreathed in realistic orange flame, the other half crackling with cyan-white electricity, dramatic rim lighting on both halves, sharp clean dividing line, premium high-contrast product shot.

---

### Notes
- Negative prompts (if supported): *text overlays, logos, watermarks, visible faces (for the "alone" set), extra limbs, warped hands, shaky uncontrolled camera, motion blur artifacts on static objects*.
- The two match-cut moments that carry the most weight are scene 5→6 (motion-blur hand-off) and scene 7→8 (whiteout hand-off) — generate a couple of takes of those specifically, since a clean continuity cut usually takes an extra attempt or two to nail the exact exit/entry frame.
- Keep restating **cyan / violet / pink** in every prompt (already baked in above) so all 10 clips read as one coherent sequence end to end.
