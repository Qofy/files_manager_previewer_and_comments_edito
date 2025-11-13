# Tag/Label System Feature

## Overview
Implemented a Google Drive-style tag/label system for organizing files and folders with color-coded visual indicators.

## Implementation Details

### 1. Data Model Updates

#### Storage (`src/lib/server/storage.js`)
- Added `availableTags` array with 6 predefined tags:
  - **Work** (#1967d2 - Blue)
  - **Personal** (#188038 - Green)
  - **Important** (#d93025 - Red)
  - **Shared** (#f9ab00 - Yellow)
  - **Archived** (#5f6368 - Gray)
  - **Draft** (#e37400 - Orange)

- Added `tags: []` field to all files and folders in storage
- Sample data initialized with example tags for demonstration

### 2. API Endpoints

#### Tag Management
- `GET /tags` - Retrieve all available tags
  - Returns array of tag objects with `id`, `name`, and `color`

#### File Tags
- `POST /files/[id]/tags` - Add tags to a file
  - Body: `{ tags: ['work', 'important'] }`
  - Prevents duplicate tags
  - Returns updated file object

- `DELETE /files/[id]/tags?tag=<tagId>` - Remove tag from file
  - Query param: `tag` (tag ID to remove)
  - Returns updated file object

#### Folder Tags
- `POST /folders/[id]/tags` - Add tags to a folder
  - Body: `{ tags: ['personal'] }`
  - Prevents duplicate tags
  - Returns updated folder object

- `DELETE /folders/[id]/tags?tag=<tagId>` - Remove tag from folder
  - Query param: `tag` (tag ID to remove)
  - Returns updated folder object

#### Filtering Updates
- `GET /files?tag=<tagId>` - Filter files by tag
- `GET /folders?tag=<tagId>` - Filter folders by tag

### 3. UI Components

#### TagPill Component (`src/lib/components/TagPill.svelte`)
- Displays individual tags as colored pills
- Props:
  - `tag`: Tag name (string)
  - `color`: Hex color code
  - `removable`: Boolean to show remove button
- Features:
  - Rounded pill design
  - Color-coded background
  - Optional X button for removal
  - Dispatches `remove` event

#### TagSelector Component (`src/lib/components/TagSelector.svelte`)
- Interactive dropdown for tag management
- Props:
  - `itemId`: File or folder ID
  - `itemType`: 'file' or 'folder'
  - `currentTags`: Array of current tag IDs
  - `availableTags`: Array of all available tags
- Features:
  - Tag icon button with count badge
  - Dropdown with checkbox list
  - Color preview boxes
  - Click-outside detection
  - Dispatches `add` and `remove` events

### 4. Files Page Integration

#### UI Updates (`src/routes/files/+page.svelte`)
- Added tag filter dropdown in filters section
- Added "Tags" column to file table
- Each file row displays:
  - Tag pills for current tags
  - TagSelector for adding/removing tags
- Folder cards updated with tag display at bottom
- Added CSS for `.tags-cell` and `.folder-tags`

#### State Management
- `availableTags`: Loaded from `/tags` endpoint on mount
- `filterTag`: New filter state (default: 'all')
- Reactive updates when tags are added/removed

#### Event Handlers
- `handleAddTag(event)`: Adds tags via API, reloads files/folders
- `handleRemoveTag(event)`: Removes tags via API, reloads files/folders
- `getTagColor(tagId)`: Returns color for tag ID
- `getTagName(tagId)`: Returns display name for tag ID

### 5. Style Updates

#### Folder Cards
- Changed layout from centered to flex-start
- Added `folder-content` div for clickable area
- Added `folder-tags` div for tag management
- Increased min-height to accommodate tags

#### Tag Display
- `.tags-cell`: Flex container for file row tags
- `.folder-tags`: Flex container for folder card tags
- Both use `flex-wrap: wrap` for multiple tags

## User Experience

### Adding Tags
1. Click the tag icon button on any file or folder
2. Dropdown appears with all available tags
3. Check/uncheck tags to add/remove
4. Changes apply immediately

### Filtering by Tags
1. Use the "Tag" dropdown in the filters section
2. Select a tag to show only items with that tag
3. Select "All Tags" to clear the filter

### Visual Indicators
- Tags displayed as colored pills
- Each tag has a unique color for quick recognition
- Tag count badge shows number of tags on an item

## Technical Notes

### Data Persistence
- Tags stored in in-memory Map structures
- **Production**: Replace with database storage

### Authentication
- All tag operations require JWT authentication
- Users can only modify tags on their own files/folders

### Performance
- Tags loaded once on page mount
- Filter updates trigger new API calls
- No client-side caching (can be optimized)

## Future Enhancements

1. **Custom Tags**: Allow users to create their own tags
2. **Tag Colors**: Let users customize tag colors
3. **Bulk Operations**: Apply tags to multiple files at once
4. **Tag Search**: Search for items by multiple tags
5. **Tag Statistics**: Show tag usage counts
6. **Tag Autocomplete**: Suggest tags as user types
7. **Tag Hierarchy**: Nested tags or tag groups
8. **Tag Permissions**: Share tags between users

## File Changes Summary

### New Files
- `src/lib/components/TagPill.svelte` (60 lines)
- `src/lib/components/TagSelector.svelte` (150 lines)
- `src/routes/tags/+server.js` (7 lines)
- `src/routes/files/[id]/tags/+server.js` (95 lines)
- `src/routes/folders/[id]/tags/+server.js` (95 lines)

### Modified Files
- `src/lib/server/storage.js`: Added tags field and availableTags
- `src/routes/files/+server.js`: Added tag filtering, tags field in new files
- `src/routes/folders/+server.js`: Added tag filtering, tags field in new folders
- `src/routes/files/+page.svelte`: Added tag UI, handlers, and filtering
- `README.md`: Updated documentation

### Total Lines Added: ~600 lines
