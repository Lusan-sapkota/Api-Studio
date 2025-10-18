# Environments

Environments in API Studio allow you to manage different configurations for your API testing across various stages of development, from local testing to production deployment.

## Overview

Environments provide a way to:
- **Manage Variables**: Store and organize configuration values
- **Switch Contexts**: Easily switch between different environments
- **Secure Secrets**: Safely handle sensitive information
- **Team Collaboration**: Share environment configurations
- **Dynamic Testing**: Use variables across all API clients

## Default Environments

API Studio comes with two pre-configured environments:

### Local Environment
- **Purpose**: Local development and testing
- **Base URL**: `http://localhost:56173`
- **Default Variables**: Common local development settings
- **Active by Default**: Yes

### Production Environment  
- **Purpose**: Production API testing
- **Base URL**: `https://api.example.com`
- **Default Variables**: Production-ready configurations
- **Active by Default**: No

## Creating Environments

### New Environment
1. Navigate to Environments page
2. Click "New Environment"
3. Enter environment name
4. Add description (optional)
5. Configure variables
6. Save environment

### Environment Properties
- **Name**: Descriptive environment name
- **Description**: Optional detailed description
- **Active Status**: Whether environment is currently active
- **Variable Count**: Number of variables defined
- **Created Date**: When environment was created

## Managing Variables

### Adding Variables
1. Open an environment
2. Click "Add Variable"
3. Enter key-value pair
4. Set enabled status
5. Mark as secret if needed

### Variable Types
- **String**: Text values (URLs, names, etc.)
- **Number**: Numeric values (ports, IDs, etc.)
- **Boolean**: True/false values
- **Secret**: Sensitive data (passwords, tokens)

### Variable Properties
- **Key**: Variable name (used in {{key}} syntax)
- **Value**: Variable value
- **Enabled**: Whether variable is active
- **Secret**: Whether value should be masked
- **Description**: Optional variable documentation

## Using Variables

### Syntax
Use double curly braces to reference variables:
```
{{variable_name}}
```

### In URLs
```
{{base_url}}/api/v1/users/{{user_id}}
```

### In Headers
```
Authorization: Bearer {{access_token}}
X-API-Key: {{api_key}}
```

### In Request Bodies
```json
{
  "environment": "{{env_name}}",
  "version": "{{api_version}}",
  "debug": {{debug_mode}}
}
```

## Secret Management

### Marking Variables as Secret
1. Edit variable
2. Check "Secret" checkbox
3. Value will be masked in UI
4. Still usable in requests

### Secret Display
- **Masked View**: Shows asterisks (********)
- **Reveal Option**: Click eye icon to show/hide
- **Secure Storage**: Encrypted in local storage
- **Team Sharing**: Secrets not shared by default

### Best Practices for Secrets
- Always mark sensitive data as secret
- Use environment variables for API keys
- Rotate secrets regularly
- Don't commit secrets to version control

## Environment Switching

### Activating Environments
1. Go to Environments page
2. Click "Activate" next to desired environment
3. Environment becomes active immediately
4. All requests use new environment variables

### Active Environment Indicator
- **Badge**: "Active" badge on current environment
- **Sidebar**: Active environment shown in status
- **Requests**: Variables resolved from active environment

### Switching Impact
- **Immediate**: All new requests use new environment
- **Existing Tabs**: May need refresh to update
- **Collections**: Automatically use new environment

## Variable Scoping

### Environment Variables
- **Scope**: Available across all requests
- **Priority**: Lower than collection variables
- **Usage**: Global configuration values

### Collection Variables
- **Scope**: Available within specific collection
- **Priority**: Higher than environment variables
- **Usage**: Collection-specific overrides

### Request Variables
- **Scope**: Available within specific request
- **Priority**: Highest priority
- **Usage**: Request-specific values

## Advanced Features

### Variable Inheritance
```
Environment: base_url = "https://api.example.com"
Collection: base_url = "https://staging-api.example.com"
Request: Uses collection value (staging)
```

### Dynamic Variables
- **Timestamps**: `{{$timestamp}}`
- **Random Values**: `{{$randomInt}}`
- **UUIDs**: `{{$guid}}`
- **Current Date**: `{{$isoTimestamp}}`

### Conditional Variables
```json
{
  "url": "{{#if production}}{{prod_url}}{{else}}{{dev_url}}{{/if}}"
}
```

## Team Collaboration

### Sharing Environments
1. Export environment configuration
2. Share file with team members
3. Team imports environment
4. Customize local values as needed

### Environment Templates
- **Base Templates**: Common environment structures
- **Team Standards**: Standardized variable names
- **Best Practices**: Recommended configurations
- **Documentation**: Variable usage guidelines

### Sync Strategies
- **Manual Export/Import**: File-based sharing
- **Git Integration**: Version control environments
- **Team Workspaces**: Shared environment management
- **Cloud Sync**: Automatic synchronization (coming soon)

## Environment Validation

### Variable Validation
- **Required Variables**: Mark essential variables
- **Format Validation**: URL, email, number formats
- **Value Constraints**: Min/max values, patterns
- **Dependency Checking**: Variable relationships

### Health Checks
- **Connectivity Tests**: Verify base URLs are reachable
- **Authentication Tests**: Validate API keys and tokens
- **Service Status**: Check dependent service availability
- **Performance Metrics**: Monitor response times

## Import and Export

### Export Formats
- **JSON**: Native API Studio format
- **Postman**: Compatible with Postman environments
- **Environment Files**: Standard .env file format
- **CSV**: Spreadsheet-compatible format

### Import Sources
- **Postman Environments**: Import existing Postman environments
- **Environment Files**: Load from .env files
- **JSON Configuration**: Import from JSON files
- **Manual Entry**: Create from scratch

### Backup and Restore
- **Automatic Backups**: Regular environment snapshots
- **Manual Exports**: On-demand backups
- **Version History**: Track environment changes
- **Restore Points**: Rollback to previous versions

## Best Practices

### Organization
1. **Descriptive Names**: Use clear environment names
2. **Consistent Variables**: Standardize variable names across environments
3. **Documentation**: Document variable purposes
4. **Grouping**: Organize related variables together

### Security
1. **Secret Management**: Always mark sensitive data as secret
2. **Access Control**: Limit environment access appropriately
3. **Regular Rotation**: Update secrets periodically
4. **Audit Trail**: Track environment changes

### Maintenance
1. **Regular Reviews**: Audit variables periodically
2. **Cleanup**: Remove unused variables
3. **Updates**: Keep values current
4. **Testing**: Verify environment functionality

## Troubleshooting

### Variable Resolution Issues
- **Check Spelling**: Verify variable names match exactly
- **Case Sensitivity**: Variables are case-sensitive
- **Scope Priority**: Higher scope variables override lower
- **Active Environment**: Ensure correct environment is active

### Common Problems
- **Missing Variables**: Variable not defined in active environment
- **Wrong Values**: Check environment activation
- **Secret Access**: Verify secret variable configuration
- **Sync Issues**: Check import/export processes