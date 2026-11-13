# Features

## True Anonymity for Public Inputs

We have implemented strict anonymity measures for all public data collection (Public Forms and Public Interviewer) to ensure user privacy and prevent fingerprinting.

"This form uses end-to-end anonymization. Your IP address, device ID, and exact submission time are not recorded. Once submitted, there is no technical way for the form creator or the platform to link this response back to you."






### 1. Zero Metadata Collection
- **User-Agent**: We **do not** collect or store User-Agent strings (browser/OS details). This prevents device fingerprinting of users with rare configurations.

### 2. Timestamp Sanitization
To prevent cross-referencing submission times with external server logs (which could theoretically de-anonymize a user), we sanitize all timestamps for public entries.
- **Method**: All `created_at` timestamps for public stories and responses are rounded to **00:00:00 UTC** of the submission day.
- **Implementation**:
    - The server submission endpoint (`POST /api/public/submit-story` in `server/routes/public.ts`) computes this rounded UTC midnight timestamp server-side for both Public Forms (`/submit-story/:formId`) and Public Interviewer (`/interview/:formId`) submissions.
These measures apply to:
- Stories (`stories` table)
- Slider Responses (`slider_responses` table)
- Triangle Responses (`triangle_responses` table)
- Participant Responses (`participant_responses` table)

*Note: Authenticated submissions (when a user is logged in) continue to record precise timestamps for proper history tracking.*
