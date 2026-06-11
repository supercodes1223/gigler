# Submission Checklist — Google for Startups AI Agents Challenge

> **Deadline: Wednesday June 11, 2026, 5:00 PM PDT.**
> **Hard internal rule: SUBMIT BY 3:00 PM PDT, not 4:59.** Devpost gets slow near deadlines, video processing takes time, and we want a 2-hour buffer for anything broken.

Owners: **AGENT** = can be done in Cursor / by the agent. **USER** = requires human credentials, devices, or judgment.

---

## Phase 1 — Ship & secure (morning, by 10:00 AM)

- [ ] **1. Deploy latest main** — confirm the Quality Loop code is merged and pushed; Amplify CI/CD picks it up automatically (`git add` → `commit` → `push`, never local builds). Verify the Amplify console build goes green. — **USER** (push) + **AGENT** (verify nothing uncommitted)
- [ ] **2. Smoke-test production** — text the Gigler number, run one full bills gig end-to-end (create → receipt photo → dashboard link → OTP works). This is also the dry run for the video. — **USER**
- [ ] **3. Rotate secrets** — Twilio, Gemini, and OpenAI keys currently live in `.env` are going into a video + a public-repo spotlight. Rotate all three in their consoles, update `.env`, run `scripts/backup-amplify-env.sh` **then** `scripts/set-amplify-env.sh`, redeploy. Confirm the old keys are revoked. — **USER**
- [ ] **4. Repo hygiene check** — confirm https://github.com/supercodes1223/gigler is public, README presentable, no committed secrets in history (`git log -p -S "AIza"` style spot checks), `.env` gitignored. — **AGENT** (scan) + **USER** (make public if not)
- [ ] **5. Create the judge sample deliverable** — run a fresh, clean bills-split gig with non-personal data; capture its `shortCode` and OTP handling. Fill `{{SAMPLE_SHORTCODE}}` and `{{SAMPLE_OTP_OR_NOTE_IF_UNGATED}}` in `testing-access.md`. — **USER**

## Phase 2 — Record (by 12:30 PM)

- [ ] **6. Export the architecture diagram** with the Quality Loop highlighted (PNG, ≥1920px) — source: `architecture/gigler-orca-tech-diagram.html` or the mermaid in `docs/gigler-self-improvement.md`. — **AGENT** (prepare) + **USER** (approve)
- [ ] **7. Capture the CloudWatch judge-verdict screenshot** — one clean log line, PII redacted. — **USER**
- [ ] **8. Record all shots** per the shot-list in `video-script.md` (SMS thread, receipt photo, dashboard, landing page, B-roll deliverables). — **USER**
- [ ] **9. Record voiceover** per the script. — **USER**
- [ ] **10. Edit to ≤2:30**, export 1080p MP4. — **USER**

## Phase 3 — Upload & fill (by 2:30 PM)

- [ ] **11. Upload video to YouTube as Unlisted** — confirm it plays back at full quality after processing (processing can take 15–30 min for 1080p). Copy the link into `devpost-submission.md` (`{{YOUTUBE_UNLISTED_LINK}}`). — **USER**
- [ ] **12. Fill every placeholder** in `testing-access.md` (`{{GIGLER_PHONE_NUMBER}}`, `{{SAMPLE_SHORTCODE}}`, `{{SAMPLE_OTP_OR_NOTE_IF_UNGATED}}`, `{{CONTACT_EMAIL}}`). — **USER**
- [ ] **13. Fill the Devpost form** — every field, copy from `devpost-submission.md` and `testing-access.md`:
  - [ ] Project name: *Gigler Orca: AI Gig Orchestration for Completed Work*
  - [ ] Tagline (the ~140-char line)
  - [ ] Full project description (inspiration / what it does / how we built it / challenges / accomplishments / learned / what's next)
  - [ ] **"Try it out" links**: https://gigler.ai + https://github.com/supercodes1223/gigler
  - [ ] **Code repository link**: https://github.com/supercodes1223/gigler
  - [ ] **Video link**: the YouTube unlisted URL
  - [ ] **Architecture diagram**: upload the exported PNG (image gallery / file upload field)
  - [ ] **Image gallery**: diagram + 1–2 screenshots (SMS thread, bills dashboard) + thumbnail
  - [ ] **Testing access / instructions**: paste from `testing-access.md`
  - [ ] **Built with**: list from `devpost-submission.md`
  - [ ] **Theme**: **Optimize (Existing Agents)**
  - [ ] **Region**: **AMERS**
  — **USER** (form entry) + **AGENT** (final copy review)
- [ ] **14. Cross-check every link in the submission** — gigler.ai loads, sample deliverable + OTP works, GitHub repo is public, YouTube video plays in an incognito window. — **USER**

## Phase 4 — Submit (by 3:00 PM, hard stop)

- [ ] **15. Submit on Devpost.** Screenshot the confirmation page. — **USER**
- [ ] **16. Post-submit sanity check** — open the public submission page logged out; verify video embeds, images render, links work. Devpost allows edits until the deadline if anything's off. — **USER**

---

## Quick risk register

| Risk | Mitigation |
|---|---|
| Amplify build fails after secret rotation | Rotate in the morning (step 3), not after lunch — leaves the whole day to fix |
| YouTube processing slow / stuck | Upload by 2:00 PM at the latest; processing before deadline is mandatory |
| OTP gate confuses judges | Sample deliverable instructions in `testing-access.md` include the OTP or an ungated sample |
| Demo gig flakes during recording | Dry run first (step 2); record the second, warm take |
| Devpost form autosave loses text | Draft everything in `devpost-submission.md` first; paste, never compose in the form |
