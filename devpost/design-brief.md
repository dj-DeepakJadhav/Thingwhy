---
status: approved
approved: 2026-11-06
---

# Design brief: Thingwhy — Zipper
Approval: user explicitly approved devpost/zipper-build-proposal.md and requested implementation on 2026-11-06. This brief transcribes that approved proposal and the earlier confirmed decisions.

## The one spatial moment
While seated, pinch-drag an oversized zipper in front of you, expose the slider's hidden channels, solve a short teaching-model assembly mystery, and prove your understanding by closing and reopening it.

## Why it belongs on glasses
- Uses: draws in the world and leaves your body free.
- The mechanism has spatial depth and can be inspected from different viewpoints while your hands operate it. No camera recognition is needed. Seated use is mandatory; walking is optional inspection, never a completion requirement.

## Product or overlay
- Type: product; the virtual teaching model is the experience.
- What the real version would sense: ordinary hand interactions only.
- Stand-in for the preview: mouse-driven SIK interactions exercise the same controls.

## Where things live
- Look slightly below eye level, in front of the seated user.
- Zipper: approximately 30 cm tall by 20 cm wide, roughly 55 cm away; manually place/recenter it. These are approved starting dimensions to validate and tune in Preview.
- Controls and reward: beside/below the zipper, within the same seated two-foot interaction radius; show contextually and keep all mandatory actions stationary.
- No head-locked panel or placement behind the user.

## Hands and input
- Pinch-drag the large pull on a constrained rail to close/reopen.
- Large standard SIK/UIKit controls: start, inspect/cutaway, slow motion, hint, pause/resume, recenter, reset, prediction choices, and teaching-model assembly.
- Targets are big and highlight when aimed at.
- No controller pairing, voice, custom gestures, or two-hand gesture requirement.

## When things show
- Cold start presents the zipper and a clear first task.
- Use > Predict > Investigate > Fix > Prove: show the current task and controls; keep exploration and free hints available without penalties.
- Predict records an answer before the learner tests reverse travel.
- Cutaway labels and highlights match the same mechanism state as the physical motion.
- Fix is explicitly an authored cutaway teaching-model assembly puzzle, not practical repair advice; verify the selected channel geometry before finalizing accepted arrangements.
- Discovered follows purposeful inspection; Repaired follows correct assembly; Understood follows closing and reopening the restored model.
- Award one operable miniature on an in-session Things Understood shelf after proof.
- Pause freezes progression/motion, safely releases active grabs, and preserves session progress. Resume requires fresh interaction.
- Reset clears episode progress/reward and restores exactly one initial model.
- Out-of-view attention: keep required content in view and provide recenter; no behind-user task.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Start, place/recenter, operate, inspect, get hints, solve, pause/resume, and reset using standard mouse-driven hand equivalents, without controller pairing or walking.
2. Closing and reversing slider travel continuously joins/separates the authored tooth paths, including intermediate positions, without impossible interpenetration.
3. Cutaway and slow inspection expose Y-shaped slider channels, with explanations/highlights derived from the same mechanism state.
4. Prediction is recorded before testing; incorrect predictions and authored wrong assembly receive useful feedback and allow retries. Correct assembly restores operation.
5. Required actions gate the five stages; closing then reopening the restored zipper awards the three milestones and exactly one operable miniature in-session.
6. Pause/resume preserves progress without jumps or automatic success; reset produces one clean initial episode without duplicate geometry, callbacks, or rewards.
7. A complete manual Preview run provides the full moment within 10 minutes with the model and controls inside the seated two-foot interaction envelope.

## Out of scope
- Other collection episodes or a generalized object engine.
- Cloth simulation, purchased assets, recognition, persistent storage/anchors, multiplayer, speed scoring, leaderboards, controllers as a dependency.
- Publishing, commits, pushes, registration, external messages, account/credential changes.

## Risks and open questions
- Real hand tracking and seated comfort are feel unproven until device tested.
- UIKit imported from 5.24 produced a compatibility warning in Lens Studio 5.23.2. Verify installed APIs and actual controls; do not claim compatibility solely from compilation.
- Simplified rigid teaching geometry must not imply an exact physical engineering simulation or real-world repair procedure.
- Official hackathon FAQ recommends 5.23.2 for sign-in issues and says no SPECS developer account is needed for CLAD. Apply that local-workflow exception to the router's generic account gate.
- Current device firmware compatibility with 5.23.2 is unverified; local Preview is the demonstrated target.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
