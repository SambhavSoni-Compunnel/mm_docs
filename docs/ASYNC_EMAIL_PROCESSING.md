# Asynchronous Email Processing for MessageHarbour

## Overview

This implementation provides background email processing for MessageHarbour/MCMP emails, allowing API responses to return immediately without waiting for email sending to complete.

## Features

- **Immediate API Response**: Users receive a `202 Accepted` response with a task ID immediately
- **Background Processing**: Emails are sent in separate background threads
- **Task Tracking**: Optional endpoint to check task status
- **Only for MessageHarbour**: Mailchimp emails continue to work as before

## How It Works

### 1. Request Flow

When `use_mailchimp = False` (MessageHarbour mode):

```
User sends POST /api/send_emails
    ↓
API validates request
    ↓
Email task queued in background thread
    ↓
API returns 202 Accepted with task_id
    ↓
Background thread sends emails
    ↓
(User can continue other work)
```

### 2. API Response

When emails are queued successfully, you'll receive:

```json
{
  "message": "Email(s) queued for background processing",
  "status": "queued",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_recipients": 5,
  "note": "Emails are being processed in the background. You can continue with other tasks."
}
```

**Status Code**: `202 Accepted` (Processing in background)

### 3. Checking Task Status (Optional)

You can check the status of a background task:

```http
GET /api/background-email-status/<task_id>
```

**Response Examples**:

#### Still Processing
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

#### Completed Successfully
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "total": 5,
    "successful": 5,
    "failed": 0
  }
}
```

#### Failed
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "Connection timeout"
}
```

## Implementation Details

### Files Created/Modified

1. **`helpers/async_email_helper.py`** (NEW)
   - `BackgroundEmailProcessor`: Manages background tasks
   - `send_emails_in_background()`: Queues email task and returns immediately
   - `get_background_task_status()`: Retrieves task status

2. **`api/run_campaign/post_send_mail.py`** (MODIFIED)
   - Added `_handle_immediate_messageharbour_send()` method
   - Modified `_handle_scheduled_send()` to use background processing
   - Returns 202 status for MessageHarbour emails

3. **`api/run_campaign/get_background_email_status.py`** (NEW)
   - API endpoint to check task status

4. **`api/routes.py`** (MODIFIED)
   - Added route for background email status endpoint

### Configuration

The async processing is automatically enabled when:

```python
# In configuration/generic_config.py
use_mailchimp = False  # Uses MessageHarbour with async processing
```

If `use_mailchimp = True`, emails are sent synchronously using Mailchimp (original behavior).

## Technical Details

### Threading Model

- Uses Python's `threading.Thread` with `daemon=True`
- Each email batch runs in its own background thread
- Threads are lightweight and don't require external job queue infrastructure

### Task Storage

- Tasks are stored in-memory in the `BackgroundEmailProcessor` instance
- Task data includes: status, result, error (if any)
- Task cleanup: Consider implementing auto-cleanup for old completed tasks

### Error Handling

- Exceptions in background threads are caught and logged
- Task status is updated to `'failed'` with error message
- Frontend receives immediate 202 response even if background task fails later

## Benefits

1. **Improved UX**: Users don't wait for bulk email sends
2. **Better Performance**: API handlers don't block on I/O operations
3. **Scalability**: Can process many email batches concurrently
4. **Resilience**: Frontend remains responsive even during slow email operations

## Limitations & Considerations

1. **In-Memory Storage**: Task status is lost on server restart
   - Consider adding Redis/database storage for production persistence

2. **No Task Cancellation**: Once queued, tasks cannot be cancelled
   - Future enhancement: Add cancellation support

3. **Limited History**: Old task data accumulates in memory
   - Recommendation: Implement periodic cleanup of completed tasks

4. **Monitoring**: Limited visibility into background task metrics
   - Consider adding metrics/logging for production monitoring

## Migration Notes

### For Existing API Consumers

- **No Breaking Changes**: Existing Mailchimp flows unchanged
- **Response Code Change**: MessageHarbour responses now return `202` instead of `200`
- **New Field**: Response includes `task_id` for tracking
- **Optional**: Can use status endpoint to track progress (not required)

### Example Request

```bash
# Send emails (unchanged)
curl -X POST https://api.marketminder.ai/api/send_emails \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": ["user1@example.com", "user2@example.com"],
    "subject": "Test Email",
    "text": "Hello {{recipient_name}}",
    "recipient_names": ["User 1", "User 2"],
    "owner_email": "sender@example.com",
    "send_at": "now"
  }'

# Response (NEW: returns immediately with 202)
{
  "message": "Email(s) queued for background processing",
  "status": "queued",
  "task_id": "abc-123-def",
  "total_recipients": 2
}

# Optional: Check status later
curl -X GET https://api.marketminder.ai/api/background-email-status/abc-123-def \
  -H "Authorization: Bearer <token>"
```

## Testing

The async processing has been tested with:
- Single recipient sends
- Bulk sends (multiple recipients)
- With and without attachments
- Error scenarios

All existing unit tests pass without modification.

## Future Enhancements

1. **Persistent Task Storage**: Store in Redis or database
2. **Task Cancellation**: Allow cancelling queued/processing tasks
3. **Progress Updates**: Real-time progress for large batches
4. **Rate Limiting**: Throttle concurrent background tasks
5. **Task Expiry**: Auto-cleanup completed tasks after N days
6. **WebSocket Updates**: Push real-time status to frontend
7. **Retry Logic**: Automatic retry for failed emails

## Support

For issues or questions, contact the development team or file an issue in the project repository.
