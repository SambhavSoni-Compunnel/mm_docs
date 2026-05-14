# Run Campaign Module - Application Flow

## Purpose
Run Campaign provides an execution wizard for launching or scheduling campaigns with audience selection, email generation, follow-up setup, and draft management.

## Entry and Access
1. Sidebar item: Run Campaign.
2. Required permission: run_campaign + run_campaign.
3. Campaign list can also deep-link into this module with campaign prefill context.

## Step-Based Wizard Flow
1. Step 1: Campaign Details
- Capture campaign metadata and launch timing.
2. Step 2: Audience Preview
- Preview available contacts and initial selection.
3. Step 3: Selected Audience
- Normalize/deduplicate selected contacts.
4. Step 4: Email Draft
- Prepare generated or edited email content.
5. Step 5: Follow-Up Setup
- Configure optional follow-up sequence and schedule.
6. Step 6: Success/Execution
- Launch now, schedule, save draft, or return to campaigns.

## Step Navigation Rules
1. Wizard allows direct step navigation only if prerequisites are met.
2. Missing prerequisites block forward navigation.
3. Reset-to-step-1 action can clear current flow for fresh campaign initiation.

## Launch/Schedule Flow
1. Module composes recipient list from normalized audience data.
2. Validation checks run before execution:
- Recipients present
- Authenticated sender context
- Subject/body available
3. Execution payload is composed with:
- Campaign metadata
- Recipients
- Owner/sender info
- Scheduling info
- Optional follow-up payload
- Optional attachments
4. On success:
- Campaign send/schedule call resolves
- Draft status is updated to sent when applicable
- User is redirected back to Campaigns

## Draft Flow
1. User can save current wizard state as draft.
2. Draft dialog enforces required draft name.
3. Draft payload stores:
- Campaign context
- Email content
- Audience mapping
- Follow-up config
- Attachment metadata
4. Existing draft is updated; otherwise new draft is created.
5. On success, draft list and template list are refreshed and wizard is reset.

## Attachment Handling
1. Attachments may be local files or URL-backed references.
2. URL attachments are hydrated to file blobs before send/save when required.
3. Payload and multipart form data stay aligned with processed attachment metadata.

## Exit Behavior
1. Leaving the module resets campaign flow state to avoid stale wizard context.
2. Back-to-campaigns action explicitly clears wizard state.
