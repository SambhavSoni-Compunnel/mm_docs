# Scheduled Email System Documentation

## Overview

The Market Minder system now supports scheduled email sending using APScheduler. This allows you to send emails immediately or schedule them for a specific time in the future.

## Database Schema

The system uses a table `MM_schema.scheduled_mails` with the following structure:

```sql
CREATE TABLE IF NOT EXISTS "MM_schema".scheduled_mails (
    id SERIAL PRIMARY KEY,
    recipient_emails TEXT[] NOT NULL,
    subject VARCHAR NOT NULL,
    body TEXT NOT NULL,
    send_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    error_message TEXT
);
```

## API Usage

### Endpoint
`POST /api/send_emails`

### Request Format

The existing `/api/send_emails` endpoint now accepts an optional `send_at` parameter:

```json
{
  "send_at": "now",  // or ISO datetime string
  "emails": [
    {
      "subject": "Your Email Subject",
      "text": "Email body content",
      "to_email": ["recipient@example.com"],
      "owner_email": "sender@marketminder.ai"
    }
  ]
}
```

### Send At Options

1. **Immediate sending**:
   ```json
   {
     "send_at": "now"
   }
   ```

2. **Schedule for future**:
   ```json
   {
     "send_at": "2024-12-25T09:00:00Z"
   }
   ```

3. **Past time (sends immediately)**:
   ```json
   {
     "send_at": "2024-01-01T00:00:00Z"
   }
   ```

4. **No send_at parameter (original behavior)**:
   - Sends immediately using existing logic

## Response Formats

### Immediate Send Response
```json
{
  "message": "Email sent immediately",
  "status": "sent",
  "send_time": "2024-10-16T14:30:00Z"
}
```

### Scheduled Send Response
```json
{
  "message": "Email scheduled successfully",
  "status": "scheduled",
  "mail_id": 123,
  "scheduled_time": "2024-12-25T09:00:00Z",
  "job_id": "scheduled_mail_123"
}
```

### Error Response
```json
{
  "error": "Invalid datetime format: invalid-date. Use ISO format or 'now'"
}
```

## System Architecture

### Components

1. **API Endpoint** (`api/run_campaign/post_send_mail.py`):
   - Handles HTTP requests
   - Parses `send_at` parameter
   - Routes to immediate or scheduled sending

2. **Database Helpers** (`helpers/send_mail_helper.py`):
   - `insert_scheduled_mail()`: Store scheduled email in database
   - `mark_mail_status()`: Update email status (sent/failed)
   - `send_mail_now()`: Send email immediately
   - `get_pending_scheduled_mails()`: Retrieve pending emails

3. **Scheduler Configuration** (`helpers/scheduler_config.py`):
   - APScheduler setup and management
   - Job execution functions
   - Startup job reloading
   - Polling for new scheduled emails

### Job Management

- **Job IDs**: Format `scheduled_mail_{mail_id}`
- **Misfire Grace Time**: 5 minutes
- **Polling Interval**: Every 1 minute for new scheduled emails
- **Startup Reload**: All pending jobs are reloaded when the application starts

### Status Values

- `scheduled`: Email is scheduled for future sending
- `sent`: Email was successfully sent
- `failed`: Email sending failed (error_message contains details)

## Features

### ✅ Implemented Features

1. **Immediate Sending**: `send_at: "now"`
2. **Future Scheduling**: ISO datetime strings
3. **Past Time Handling**: Automatically sends immediately
4. **Database Persistence**: All scheduled emails stored in PostgreSQL
5. **Job Persistence**: Jobs survive application restarts
6. **Error Handling**: Failed emails marked with error messages
7. **Status Tracking**: Complete audit trail of email status
8. **Thread-Safe Operations**: Uses connection pooling
9. **Comprehensive Logging**: Detailed logging for debugging

### 🔧 Configuration

The scheduler uses the existing APScheduler instance configured in `scheduler_config.py`:

- **Job Store**: PostgreSQL (`scheduler.apscheduler_jobs` table)
- **Timezone**: Asia/Kolkata (IST)
- **Scheduler Type**: BackgroundScheduler
- **Connection Pooling**: Thread-safe database operations

## Testing

### Database Verification
```bash
python verify_scheduled_mails_db.py
```

### API Testing
```bash
python test_scheduled_mail.py
```

### Manual Testing Examples

#### 1. Send Immediately
```bash
curl -X POST http://localhost:5000/api/send_emails \
  -H "Content-Type: application/json" \
  -d '{
    "send_at": "now",
    "emails": [{
      "subject": "Test Email",
      "text": "This is a test email",
      "to_email": ["test@example.com"],
      "owner_email": "sender@marketminder.ai"
    }]
  }'
```

#### 2. Schedule for Future
```bash
curl -X POST http://localhost:5000/api/send_emails \
  -H "Content-Type: application/json" \
  -d '{
    "send_at": "2024-12-25T09:00:00Z",
    "emails": [{
      "subject": "Scheduled Email",
      "text": "This email was scheduled",
      "to_email": ["test@example.com"],
      "owner_email": "sender@marketminder.ai"
    }]
  }'
```

## Error Handling

### Common Errors

1. **Invalid datetime format**:
   - Error: `"Invalid datetime format: {value}. Use ISO format or 'now'"`
   - Solution: Use ISO 8601 format or "now"

2. **Database connection issues**:
   - Error: Connection timeout or pool exhaustion
   - Solution: Check database connectivity and pool configuration

3. **Job scheduling failures**:
   - Error: APScheduler job creation failed
   - Solution: Check scheduler status and database permissions

### Logging

All operations are logged with appropriate levels:
- `INFO`: Normal operations (scheduling, sending)
- `WARNING`: Non-critical issues (past time scheduling)
- `ERROR`: Failures (send failures, database errors)

## Maintenance

### Monitoring Scheduled Emails

```sql
-- Check pending emails
SELECT id, subject, send_at, status 
FROM "MM_schema".scheduled_mails 
WHERE status = 'scheduled' 
ORDER BY send_at;

-- Check recent email activity
SELECT status, COUNT(*) 
FROM "MM_schema".scheduled_mails 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Check failed emails
SELECT id, subject, error_message, created_at
FROM "MM_schema".scheduled_mails 
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Cleanup Old Records

```sql
-- Clean up old sent emails (older than 30 days)
DELETE FROM "MM_schema".scheduled_mails 
WHERE status = 'sent' 
AND sent_at < NOW() - INTERVAL '30 days';

-- Clean up old failed emails (older than 7 days)
DELETE FROM "MM_schema".scheduled_mails 
WHERE status = 'failed' 
AND created_at < NOW() - INTERVAL '7 days';
```

## Security Considerations

1. **Authentication**: All endpoints require token authentication
2. **Input Validation**: Datetime parsing with proper error handling
3. **SQL Injection Prevention**: Using parameterized queries
4. **Resource Limits**: Connection pooling prevents resource exhaustion

## Performance

### Optimizations

1. **Connection Pooling**: Reuses database connections
2. **Batch Operations**: Efficient database queries
3. **Index Recommendations**:
   ```sql
   CREATE INDEX idx_scheduled_mails_status_send_at 
   ON "MM_schema".scheduled_mails (status, send_at);
   
   CREATE INDEX idx_scheduled_mails_created_at 
   ON "MM_schema".scheduled_mails (created_at);
   ```

### Scalability

- **Job Persistence**: Jobs survive application restarts
- **Multiple Instances**: Database-backed job store supports clustering
- **Resource Management**: Configurable connection pool limits

## Troubleshooting

### Common Issues

1. **Emails not being sent**:
   - Check scheduler status: `scheduler.running`
   - Verify database connectivity
   - Check job queue: `scheduler.get_jobs()`

2. **Jobs not persisting**:
   - Verify `scheduler.apscheduler_jobs` table exists
   - Check database permissions
   - Review scheduler configuration

3. **Datetime parsing errors**:
   - Use ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`
   - Ensure timezone awareness
   - Validate datetime strings

### Debug Commands

```python
# Check scheduler status
from helpers.scheduler_config import scheduler
print(f"Scheduler running: {scheduler.running}")
print(f"Active jobs: {len(scheduler.get_jobs())}")

# List scheduled mail jobs
for job in scheduler.get_jobs():
    if job.id.startswith('scheduled_mail_'):
        print(f"Job: {job.id}, Next run: {job.next_run_time}")
```