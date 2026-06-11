# Submission Checklist — Google for Startups AI Agents Challenge

> **Deadline: Wednesday June 11, 2026, 5:00 PM PDT.**
> **Hard internal rule: SUBMIT BY 3:00 PM PDT, not 4:59.** Devpost gets slow near deadlines,
> video processing takes time, and we want a 2-hour buffer for anything broken.

Owners: **AGENT** = done in Cursor / by the agent. **USER** = requires human credentials, devices, or judgment.

Locked decisions: code-only deploy to main (marketing branch stays unmerged) · repo stays **private**
(judge access on request) · video is **captions-only**, assembled by the agent · demo gig = **invite site**.

---

## Done overnight (AGENT)

- [x] Quality Loop (Gemini judge pass + action veto + qualityLog capture) implemented, 465 tests passing
- [x] Learning-store **injection** into next-gig context (makes the submission claim true)
- [x] Hardcoded Twilio + AppSync credentials removed from current code (still in git history — see rotation below)
- [x] Code-only deploy pushed to main (Amplify build #198+)
- [x] Architecture diagram: `architecture/gigler-challenge-architecture.png` (1920×1080, Quality Loop highlighted)
- [x] Devpost copy: `devpost-submission.md` (fact-checked against the codebase)
- [x] Testing access doc: `testing-access.md` (placeholders marked)
- [x] Video pipeline + edit plan: `video-script.md`, stages in `video-assets/`

## Overnight remaining (AGENT)

- [ ] **A1. Verify Amplify build green**, judge verdicts visible in CloudWatch
- [ ] **A2. Run the live demo gig** (invite site) end-to-end against prod; capture the real SMS exchange + `shortCode`
- [ ] **A3. Capture deliverable page + CloudWatch judge-verdict screenshot** (PII redacted)
- [ ] **A4. Assemble the captioned video** (≤2:30, 1080p MP4), ready for your review

## Morning (USER, by 11:00 AM)

- [ ] **U1. Rotate the Twilio auth token** (Twilio console → Account → API keys & tokens). It is in git
      history (~160 commits) and grants full control of the SMS line. Then update `.env` and the Amplify
      Hosting env var `TWILIO_AUTH_TOKEN`, and redeploy (empty commit to main is fine).
      *Recommended same pass:* rotate the AppSync API key (also in history). Gemini/OpenAI keys were
      never committed — rotation optional.
- [ ] **U2. Watch the video once** (phone speaker test). Request edits or approve.
- [ ] **U3. Sanity-text the Gigler number yourself** — one quick gig, confirm replies feel right post-deploy.
- [ ] **U4. Upload video to YouTube as Unlisted** — confirm it plays after processing (15–30 min for 1080p).

## Early afternoon (USER + AGENT, by 2:30 PM)

- [ ] **U5. Fill placeholders** in `testing-access.md`: `{{GIGLER_PHONE_NUMBER}}`, `{{SAMPLE_SHORTCODE}}`
      (from the overnight demo run), `{{SAMPLE_OTP_OR_NOTE_IF_UNGATED}}`, `{{CONTACT_EMAIL}}`,
      and `{{YOUTUBE_UNLISTED_LINK}}` in `devpost-submission.md`.
- [ ] **U6. Fill the Devpost form** (log in; the agent can drive the browser with you watching):
  - [ ] Project name: *Gigler Orca: AI Gig Orchestration for Completed Work*
  - [ ] Tagline (137-char line from `devpost-submission.md`)
  - [ ] Full project description (paste from `devpost-submission.md`)
  - [ ] "Try it out" link: https://gigler.ai
  - [ ] Code: https://github.com/supercodes1223/gigler (private — note "judge access on request" in testing instructions)
  - [ ] Video link: YouTube unlisted URL
  - [ ] Image gallery: architecture PNG + SMS-stage frame + deliverable screenshot + thumbnail
  - [ ] Testing access / instructions: paste from `testing-access.md`
  - [ ] Built with: list from `devpost-submission.md`
  - [ ] **Theme: Optimize (Existing Agents)** · **Region: AMERS**
- [ ] **U7. Cross-check every link** — gigler.ai loads, sample deliverable opens, YouTube plays in incognito.

## Submit (by 3:00 PM, hard stop)

- [ ] **U8. Submit on Devpost.** Screenshot the confirmation page.
- [ ] **U9. Post-submit check** — open the public submission page logged out; video embeds, images render.
      Devpost allows edits until the deadline if anything's off.

---

## Quick risk register

| Risk | Mitigation |
|---|---|
| Amplify build fails after Twilio rotation | Rotate at U1 (morning), leaves the whole day; agent monitors the build |
| YouTube processing slow / stuck | Upload by 11 AM (U4), not after lunch |
| OTP gate blocks judges on the sample | Tested overnight (A2/A3); access note goes in `testing-access.md` |
| Demo gig flaked overnight | Agent re-runs until clean; replies are real, never mocked |
| Devpost form autosave loses text | Everything drafted in `devpost-submission.md`; paste, never compose in the form |
