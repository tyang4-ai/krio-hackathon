---
name: error-tracking
description: Add Sentry v8 error tracking and performance monitoring to Clinisight Lambda functions. Use this skill when adding error handling, instrumenting Lambda functions, tracking agent failures, or monitoring DynamoDB performance. ALL ERRORS MUST BE CAPTURED TO SENTRY - no exceptions.
---

# Clinisight Sentry Integration Skill

## Purpose
This skill enforces comprehensive Sentry error tracking and performance monitoring across all Clinisight AWS Lambda functions and agents.

## When to Use This Skill
- Adding error handling to Lambda functions
- Instrumenting orchestrator or agent code
- Tracking agent execution failures
- Monitoring DynamoDB performance
- Adding performance spans for API calls
- Debugging production issues

## 🚨 CRITICAL RULE

**ALL ERRORS MUST BE CAPTURED TO SENTRY** - No exceptions. Never use print() or logging alone for errors.

## Current Status

### Clinisight Backend 🔴 NOT INTEGRATED
- No Sentry integration yet
- Using basic logging only
- ALL Lambda functions need instrumentation
- Agent failures not tracked

## Sentry Integration Patterns for AWS Lambda

### 1. Lambda Handler Error Handling

```python
import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration

# Initialize Sentry (in handler.py)
sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    integrations=[AwsLambdaIntegration()],
    traces_sample_rate=0.1,
    environment=os.environ.get("ENVIRONMENT", "development"),
)

def lambda_handler(event, context):
    try:
        # Your Lambda logic
        result = process_event(event)
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as error:
        sentry_sdk.capture_exception(error)
        sentry_sdk.capture_message(f"Lambda invocation failed: {str(error)}", level="error")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
```

### 2. Orchestrator Pattern

```python
import sentry_sdk
from shared.logger import Logger

logger = Logger()

def route_event(event):
    """Routes events to appropriate agent Lambdas"""
    try:
        event_type = event.get('type')

        with sentry_sdk.start_span(op="orchestrator.route", description=f"Route {event_type}"):
            agent_response = invoke_agent(event_type, event)

        return agent_response

    except Exception as error:
        sentry_sdk.capture_exception(error, extras={
            'event_type': event_type,
            'event': event,
            'operation': 'route_event'
        })
        logger.error(f"Failed to route event: {str(error)}")
        raise
```

### 3. Agent Error Handling

```python
import sentry_sdk
from shared.database import save_agent_state

def tasksmith_handler(event, context):
    """TaskSmith agent - Epic decomposition"""
    issue_key = event.get('issue', {}).get('key')

    try:
        with sentry_sdk.start_span(op="agent.tasksmith", description=f"Process {issue_key}"):
            # Decompose epic into subtasks
            subtasks = decompose_epic(event)

            # Save state to DynamoDB
            save_agent_state('tasksmith', issue_key, subtasks)

            return {
                'statusCode': 200,
                'body': json.dumps({'subtasks': subtasks})
            }

    except Exception as error:
        sentry_sdk.capture_exception(error, extras={
            'agent': 'tasksmith',
            'issue_key': issue_key,
            'event': event
        })
        # Still save failure state
        save_agent_state('tasksmith', issue_key, {'error': str(error)})
        raise
```

### 4. DynamoDB Performance Monitoring

```python
import sentry_sdk
import boto3
import time

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ClinisightAgentState')

def get_agent_state(agent_name, entity_id):
    """Get agent state with performance tracking"""
    start_time = time.time()

    try:
        with sentry_sdk.start_span(op="db.dynamodb.get", description=f"Get {agent_name}/{entity_id}"):
            response = table.get_item(
                Key={
                    'agent_name': agent_name,
                    'entity_id': entity_id
                }
            )

        # Track slow queries
        duration = time.time() - start_time
        if duration > 0.1:  # 100ms threshold
            sentry_sdk.capture_message(
                f"Slow DynamoDB query: {agent_name}/{entity_id} took {duration:.2f}s",
                level="warning"
            )

        return response.get('Item')

    except Exception as error:
        sentry_sdk.capture_exception(error, extras={
            'operation': 'get_agent_state',
            'agent_name': agent_name,
            'entity_id': entity_id
        })
        raise
```

### 5. External API Call Monitoring

```python
import sentry_sdk
import requests

def call_atlassian_api(endpoint, method='GET', data=None):
    """Call Atlassian API with error tracking"""
    url = f"https://api.atlassian.com{endpoint}"

    try:
        with sentry_sdk.start_span(op="http.client", description=f"{method} {endpoint}"):
            response = requests.request(
                method=method,
                url=url,
                headers={'Authorization': f'Bearer {get_token()}'},
                json=data,
                timeout=10
            )
            response.raise_for_status()

        return response.json()

    except requests.exceptions.Timeout as error:
        sentry_sdk.capture_exception(error, extras={
            'endpoint': endpoint,
            'method': method,
            'error_type': 'timeout'
        })
        raise
    except requests.exceptions.HTTPError as error:
        sentry_sdk.capture_exception(error, extras={
            'endpoint': endpoint,
            'method': method,
            'status_code': error.response.status_code,
            'response_body': error.response.text[:500]
        })
        raise
```

### 6. Async Operations with Context

```python
import sentry_sdk
import boto3

lambda_client = boto3.client('lambda')

def invoke_agent_async(agent_name, payload):
    """Invoke agent Lambda asynchronously"""
    try:
        with sentry_sdk.start_span(op="lambda.invoke", description=f"Invoke {agent_name}"):
            response = lambda_client.invoke(
                FunctionName=f'clinisight-{agent_name}',
                InvocationType='Event',  # Async
                Payload=json.dumps(payload)
            )

        return response

    except Exception as error:
        sentry_sdk.capture_exception(error, extras={
            'agent_name': agent_name,
            'payload': payload,
            'operation': 'invoke_agent_async'
        })
        raise
```

## Error Levels

Use appropriate severity levels:

- **fatal**: Lambda crashed, agent failed completely
- **error**: Operation failed, needs immediate attention
- **warning**: Recoverable issues, degraded performance
- **info**: Informational messages, successful operations
- **debug**: Detailed debugging information (dev only)

## Required Context

```python
import sentry_sdk

# Set user context (if available from Atlassian)
sentry_sdk.set_user({
    "id": user_id,
    "email": user_email,
    "username": user_displayname
})

# Set tags for filtering
sentry_sdk.set_tag("service", "orchestrator")  # or "tasksmith", "agent"
sentry_sdk.set_tag("environment", os.environ.get("ENVIRONMENT"))
sentry_sdk.set_tag("aws.region", os.environ.get("AWS_REGION"))

# Set context for debugging
sentry_sdk.set_context("event", {
    "type": event_type,
    "issue_key": issue_key,
    "project": project_key
})
```

## Lambda-Specific Integration

### Orchestrator Lambda

**Location**: `./clinisight_backend/orchestrator/handler.py`

```python
import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
import os

# Initialize at module level (cold start optimization)
sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    integrations=[AwsLambdaIntegration(timeout_warning=True)],
    traces_sample_rate=0.1,
    environment=os.environ.get("ENVIRONMENT", "development"),
)

def lambda_handler(event, context):
    # Handler code with error tracking
    pass
```

### Agent Lambda (TaskSmith)

**Location**: `./clinisight_backend/agents/tasksmith.py`

```python
import sentry_sdk
from sentry_sdk.integrations.aws_lambda import AwsLambdaIntegration
import os

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    integrations=[AwsLambdaIntegration(timeout_warning=True)],
    traces_sample_rate=0.1,
    environment=os.environ.get("ENVIRONMENT", "development"),
)

def handler(event, context):
    # Agent code with error tracking
    pass
```

## Configuration (serverless.yml)

```yaml
provider:
  environment:
    SENTRY_DSN: ${env:SENTRY_DSN}
    ENVIRONMENT: ${opt:stage, 'dev'}

functions:
  orchestrator:
    environment:
      SENTRY_DSN: ${env:SENTRY_DSN}

  tasksmith:
    environment:
      SENTRY_DSN: ${env:SENTRY_DSN}
```

## Testing Sentry Integration

### Test Lambda Error Capture

```python
def test_handler(event, context):
    """Test endpoint for Sentry integration"""
    try:
        # Trigger a test error
        raise ValueError("Test error from Lambda")
    except Exception as error:
        sentry_sdk.capture_exception(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Error captured to Sentry'})
        }
```

### Test with AWS CLI

```bash
# Invoke test function
aws lambda invoke \
    --function-name clinisight-orchestrator \
    --payload '{"test": true}' \
    output.json
```

## Performance Monitoring

### Requirements

1. **All Lambda invocations** must have transaction tracking
2. **DynamoDB queries > 100ms** are automatically flagged
3. **External API calls** must track response times
4. **Agent execution time** must be tracked

### Transaction Tracking

```python
import sentry_sdk

# Automatic for Lambda with AwsLambdaIntegration
# Manual transaction for complex operations
with sentry_sdk.start_transaction(op="agent.process", name="Process Epic"):
    # Your operation
    process_epic(event)
```

## Common Mistakes to Avoid

❌ **NEVER** use print() for errors without Sentry
❌ **NEVER** swallow exceptions silently
❌ **NEVER** expose sensitive data (PHI, PII) in error context
❌ **NEVER** use generic error messages without context
❌ **NEVER** skip error handling in async Lambda invocations
❌ **NEVER** forget to initialize Sentry at module level

## Implementation Checklist

When adding Sentry to Lambda functions:

- [ ] Imported and initialized Sentry with AwsLambdaIntegration
- [ ] All try/except blocks capture to Sentry
- [ ] Added meaningful context to errors (issue_key, agent_name, etc.)
- [ ] Used appropriate error level
- [ ] No PHI/PII in error messages
- [ ] Added performance tracking for DynamoDB and API calls
- [ ] Tested error handling paths
- [ ] Added SENTRY_DSN to serverless.yml environment

## Key Files to Update

### Lambda Functions
- `/clinisight_backend/orchestrator/handler.py` - Add Sentry init
- `/clinisight_backend/agents/tasksmith.py` - Add Sentry init

### Shared Utilities
- `/clinisight_backend/shared/logger.py` - Integrate with Sentry
- `/clinisight_backend/shared/database.py` - Add performance tracking
- `/clinisight_backend/shared/security.py` - Ensure no PII in errors

### Configuration
- `/clinisight_backend/serverless.yml` - Add SENTRY_DSN env var
- `.env` - Add SENTRY_DSN for local testing

## Healthcare Compliance Notes

🏥 **HIPAA Consideration**: Never capture PHI (Protected Health Information) in Sentry errors.

```python
# ✅ CORRECT - Sanitize before capturing
sanitized_error = {
    'operation': 'process_patient_data',
    'issue_key': issue_key,  # Jira issue key is OK
    'error_type': type(error).__name__
}
sentry_sdk.capture_exception(error, extras=sanitized_error)

# ❌ WRONG - Contains patient name
sentry_sdk.capture_exception(error, extras={
    'patient_name': patient_name,  # PHI!
    'medical_record': mr_number  # PHI!
})
```

## Related Documentation

- Sentry Python SDK: https://docs.sentry.io/platforms/python/
- AWS Lambda Integration: https://docs.sentry.io/platforms/python/integrations/aws_lambda/
- Performance Monitoring: https://docs.sentry.io/product/performance/
