# Avtaar: Client Overview

Avtaar is an interactive 3D avatar platform built in-house. A rigged 3D character listens, speaks, looks at the user, and gestures during a conversation. All avatar behavior is driven by our own engines, so we control the look, the timing, and the feel of each avatar.

## What is built in-house

- The 3D avatar viewer and rendering pipeline (React Three Fiber).
- A set of 18 behavior engines that turn speech and conversation state into facial, eye, head, and body motion.
- Calibration panels for tuning eyes, head, gestures, and speech prosody per avatar rig.
- An admin area for avatar appearance, lighting, poses, and behavior settings.

## Engine list

Engines live in `avatar/engine/`. Each one has a single responsibility and does not write to the 3D model directly, except the output stage (`AvatarEngine`, `AnimationMixer`).

| Group | Engine | Purpose |
|---|---|---|
| Core output | `AvatarEngine` | Owns model writes and timing for the avatar. |
| Core output | `AnimationMixer` | Blends animation channels by priority (idle, emotion, speech, blink, debug). |
| Core output | `FacialEngine` | Holds facial control weights and handles speech silence. |
| Speech | `LipSyncEngine` | Converts audio amplitude and visemes into mouth and jaw motion. |
| Speech | `ProsodyEngine` | Reads speech energy, pitch, and emphasis as semantic signals. |
| Conversation | `BehaviorController` | Switches the avatar between idle, listening, thinking, and speaking. |
| Emotion | `EmotionEngine` | Applies six emotions: neutral, happy, sad, angry, surprised, thinking. |
| Eyes | `EyeEngine` | Eye state for the eye rig. |
| Eyes | `EyeController` | Converts gaze targets into eye rotations. |
| Eyes | `SaccadeEngine` | Adds small, quick gaze movements. |
| Eyes | `BlinkCoordinator` | Owns blink timing and blink weight. |
| Gaze | `GazeBehaviorEngine` | Chooses the gaze target for each behavior state. |
| Head | `HeadMotionEngine` | Converts head intent into bounded head motion. |
| Head | `HeadEyeCoordinator` | Adds supporting head motion that follows the gaze. |
| Gestures | `GestureIntentEngine` | Chooses a gesture intent from speech and conversation signals. |
| Gestures | `GestureTimingEngine` | Decides when a gesture may start. |
| Gestures | `GestureEngine` | Plays small gesture poses into the animation channels. |
| Idle | `IdleEngine` | Natural idle body motion when no one is speaking. |

Supporting modules: `ConversationCoordinator` (playback events), `PoseController` (10 body poses with smooth transitions), and `avatarState` (saves each avatar's look).

## Local LLM and local deployment

Our goal is to run the avatar's conversation entirely on local infrastructure:

- **Conversation model:** a local LLM running on the client's own hardware, with no dependency on an external cloud service.
- **Hosting:** the full platform deployed on the client's local server or workstation.
- **Voice:** a local speech stack, to be selected together with the client.

This is the next major milestone and is in planning.

## Lip-sync: where we are

Lip-sync is not yet at the level of leading commercial avatar tools. The current system drives mouth shapes from audio energy and 15 visemes, and it is measured with timing reference clips.

We are improving it in phases. Targets from our internal plan:

1. **Foundation:** audio-to-mouth timing within ±40 ms, and clear separation of A/E/O/M/F/S shapes.
2. **Advanced lip-sync:** at least 95% accuracy on P/B/M lip closures, median viseme timing error under 40 ms, and per-rig calibration profiles for jaw and lip gains.
3. **Ongoing:** we will publish progress updates as each phase is completed and measured.

## Update cadence

We will update this document as each engine, the local LLM, and the lip-sync phases are completed, and note the date of each change.

_Last updated: 2026-10-12_
