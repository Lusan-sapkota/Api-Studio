# Collections

Collections in API Studio help you organize and manage your API requests efficiently. They support hierarchical folder structures, the innovative 70-30 rule interface, and seamless collaboration features.

## Overview

Collections are containers for organizing related API requests. They support:

- **Hierarchical Organization**: Folders and subfolders for logical grouping
- **70-30 Rule Interface**: Intuitive navigation and interaction
- **Request Management**: Save, edit, and organize API requests
- **Collaboration**: Share collections with team members
- **Import/Export**: Backup and share collection data

## Creating Collections

### New Collection
1. Navigate to the Collections page
2. Click "New Collection" button
3. Enter a descriptive name
4. Add an optional description
5. Click "Create"

### Collection Properties
- **Name**: Descriptive collection name
- **Description**: Optional detailed description
- **Created Date**: Automatic timestamp
- **Request Count**: Number of requests in collection
- **Folder Count**: Number of folders in collection

## The 70-30 Rule Interface

API Studio uses an innovative 70-30 rule for collection interaction:

### Left 70% - Quick Actions
Click the left 70% of any collection item to:
- **Expand/Collapse**: Show or hide collection contents
- **Quick Preview**: See request count and basic info
- **Keyboard Navigation**: Use arrow keys for navigation

### Right 30% - Navigation
Click the right 30% of any collection item to:
- **Open Collection Page**: Navigate to dedicated collection view
- **Full Management**: Access all collection features
- **Detailed Editing**: Modify collection properties

### Visual Indicator
A subtle vertical line shows the 70-30 split boundary, helping users understand the interaction zones.

## Folder Organization

### Creating Folders
1. Open a collection
2. Click "New Folder" button
3. Enter folder name
4. Organize requests by dragging and dropping

### Folder Features
- **Nested Structure**: Folders within folders
- **Drag and Drop**: Easy reorganization
- **Bulk Operations**: Move multiple requests at once
- **Search**: Find requests across all folders

### Best Practices
- Use logical grouping (by feature, endpoint, version)
- Keep folder names descriptive and concise
- Limit nesting depth for better usability
- Use consistent naming conventions

## Request Management

### Saving Requests
1. Make any API request
2. Click the "Save" button
3. Choose target collection and folder
4. Enter request name and description
5. Click "Save to Collection"

### Request Properties
- **Name**: Descriptive request name
- **Method**: HTTP method (GET, POST, etc.)
- **URL**: Request endpoint
- **Headers**: Request headers
- **Body**: Request payload
- **Authentication**: Auth configuration
- **Notes**: Additional documentation

### Request Organization
- **Folders**: Group related requests
- **Tags**: Add metadata for filtering
- **Favorites**: Mark frequently used requests
- **Recent**: Quick access to recent requests

## Collection Operations

### Bulk Operations
Select multiple requests to:
- **Move**: Transfer to different folders
- **Copy**: Duplicate requests
- **Delete**: Remove multiple requests
- **Export**: Save selected requests
- **Tag**: Add metadata to multiple requests

### Search and Filter
- **Text Search**: Find requests by name or URL
- **Method Filter**: Filter by HTTP method
- **Tag Filter**: Filter by assigned tags
- **Date Filter**: Filter by creation or modification date
- **Status Filter**: Filter by response status

## Collaboration Features

### Sharing Collections
1. Open collection settings
2. Click "Share Collection"
3. Add team member emails
4. Set permission levels
5. Send invitations

### Permission Levels
- **Owner**: Full control over collection
- **Editor**: Can modify requests and folders
- **Viewer**: Read-only access to collection
- **Commenter**: Can add notes and comments

### Real-time Collaboration
- **Live Updates**: See changes from other users instantly
- **Conflict Resolution**: Automatic handling of simultaneous edits
- **Activity Feed**: Track who made what changes
- **Comments**: Discuss requests with team members

## Import and Export

### Supported Formats
- **Postman Collections**: Import existing Postman collections
- **Insomnia Workspaces**: Import Insomnia data
- **OpenAPI Specs**: Generate collections from OpenAPI definitions
- **cURL Commands**: Convert cURL to requests
- **HAR Files**: Import from browser network logs

### Export Options
- **JSON Format**: Native API Studio format
- **Postman Format**: Export for use in Postman
- **Documentation**: Generate HTML documentation
- **Backup**: Complete collection backup

### Import Process
1. Click "Import" button
2. Select file or paste content
3. Choose import options
4. Map fields if necessary
5. Review and confirm import

## Collection Templates

### Pre-built Templates
- **REST API Testing**: Common REST patterns
- **GraphQL Queries**: GraphQL operation templates
- **Authentication Flows**: OAuth, JWT, API key patterns
- **CRUD Operations**: Create, Read, Update, Delete templates
- **Error Handling**: Error response testing

### Custom Templates
1. Create a well-organized collection
2. Add comprehensive documentation
3. Save as template
4. Share with team or community

## Advanced Features

### Environment Integration
- **Variable Substitution**: Use environment variables in requests
- **Environment Switching**: Test across different environments
- **Variable Scoping**: Collection-level variables
- **Dynamic Values**: Generate dynamic test data

### Documentation Generation
- **Auto-docs**: Automatic documentation from requests
- **Custom Sections**: Add manual documentation
- **API Specs**: Generate OpenAPI specifications
- **Team Docs**: Collaborative documentation

### Version Control
- **Change History**: Track collection modifications
- **Branching**: Create collection variants
- **Merging**: Combine collection changes
- **Rollback**: Revert to previous versions

## Best Practices

### Organization
1. **Logical Grouping**: Group related requests together
2. **Consistent Naming**: Use clear, descriptive names
3. **Folder Structure**: Create intuitive hierarchies
4. **Documentation**: Add descriptions and notes

### Collaboration
1. **Clear Permissions**: Set appropriate access levels
2. **Regular Updates**: Keep collections current
3. **Communication**: Use comments for discussions
4. **Standards**: Establish team conventions

### Maintenance
1. **Regular Cleanup**: Remove outdated requests
2. **Update Documentation**: Keep docs current
3. **Review Permissions**: Audit access regularly
4. **Backup Collections**: Export important collections

## Troubleshooting

### Common Issues
- **Missing Requests**: Check folder organization and filters
- **Permission Errors**: Verify user access levels
- **Import Failures**: Validate file format and structure
- **Sync Issues**: Check network connectivity

### Performance Tips
- **Limit Collection Size**: Keep collections manageable
- **Optimize Requests**: Remove unnecessary data
- **Use Folders**: Organize for better performance
- **Regular Maintenance**: Clean up unused items