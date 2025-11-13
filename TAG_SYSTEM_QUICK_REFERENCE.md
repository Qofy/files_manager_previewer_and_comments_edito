# Tag System - Quick Reference

## Available Tags

| Tag Name | Color | Hex Code | Use Case |
|----------|-------|----------|----------|
| Work | Blue | #1967d2 | Work-related files |
| Personal | Green | #188038 | Personal documents |
| Important | Red | #d93025 | High priority items |
| Shared | Yellow | #f9ab00 | Shared with team |
| Archived | Gray | #5f6368 | Old/archived files |
| Draft | Orange | #e37400 | Work in progress |

## UI Components

### TagPill
```svelte
<TagPill tag="Work" color="#1967d2" />
<TagPill tag="Important" color="#d93025" removable on:remove={handleRemove} />
```

### TagSelector
```svelte
<TagSelector
  itemId={file.id}
  itemType="file"
  currentTags={['work', 'important']}
  availableTags={allTags}
  on:add={handleAddTag}
  on:remove={handleRemoveTag}
/>
```

## API Usage

### Get All Tags
```javascript
const response = await fetch('/tags', {
  headers: { 'Authorization': 'Bearer ' + token }
});
const tags = await response.json();
// Returns: [{ id: 'work', name: 'Work', color: '#1967d2' }, ...]
```

### Add Tags to File
```javascript
await fetch('/files/123/tags', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ tags: ['work', 'important'] })
});
```

### Remove Tag from File
```javascript
await fetch('/files/123/tags?tag=work', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer ' + token }
});
```

### Filter Files by Tag
```javascript
const response = await fetch('/files?tag=work', {
  headers: { 'Authorization': 'Bearer ' + token }
});
const { files } = await response.json();
```

## Data Structure

### File with Tags
```javascript
{
  id: '1',
  name: 'Project Proposal.pdf',
  type: 'application/pdf',
  category: 'document',
  size: 1024000,
  folder_id: '1',
  owner: 'admin',
  tags: ['work', 'important'],  // Array of tag IDs
  uploaded_at: '2024-01-15T10:30:00.000Z',
  updated_at: '2024-01-15T10:30:00.000Z'
}
```

### Folder with Tags
```javascript
{
  id: '1',
  name: 'Documents',
  path: '/Documents',
  parent_id: null,
  owner: 'admin',
  tags: ['work'],  // Array of tag IDs
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z'
}
```

## Filter Combinations

You can combine tag filtering with other filters:

```javascript
// Files in specific folder with specific tag
/files?folder_id=1&tag=work

// Files of specific type with specific tag
/files?category=documents&tag=important

// Search files with specific tag
/files?search=proposal&tag=work

// All filters combined
/files?folder_id=1&category=documents&tag=work&search=proposal
```

## Visual Design

### Tag Pills
- Rounded corners (12px border-radius)
- White text on colored background
- 11px font size
- 3-8px padding
- Inline with other content

### Tag Selector Button
- Tag icon from lucide-svelte
- Count badge when tags present
- Light gray border
- Hover effect with background change
- Dropdown positioned absolute below button

### Dropdown
- White background
- 8px border-radius
- Box shadow for depth
- Max height 300px with scroll
- Checkboxes for multi-select
- Color preview boxes (12x12px)
