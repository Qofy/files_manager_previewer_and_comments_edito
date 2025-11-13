# Profile Image Upload Feature

## Overview
Users can now upload and manage their profile images. The profile image appears in:
- Dashboard top bar profile button
- Comments on files (when the comment is from the current user)

## How to Use

### Uploading a Profile Image
1. Click on the profile circle in the top-right corner of the dashboard
2. A dropdown menu will appear with the following options:
   - **Upload Photo** (if no image is set) or **Change Photo** (if image exists)
   - **Remove Photo** (if image exists)
   - **Logout**
3. Click "Upload Photo" or "Change Photo"
4. Select an image file from your device
5. The image will be uploaded and displayed immediately

### Image Requirements
- **Supported formats**: JPG, PNG, GIF, WebP, etc. (any image format)
- **Maximum file size**: 2MB
- **Storage**: Images are stored as base64-encoded strings in memory

### Where Profile Images Appear
1. **Dashboard**: The profile circle in the top bar shows your uploaded image
2. **File Comments**: Your comments on files display your profile image instead of an initial letter

## Technical Implementation

### New API Endpoints

#### GET /profile
Get current user profile information.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "id": "1",
  "username": "admin",
  "profileImage": "data:image/png;base64,...",
  "createdAt": "2025-11-13T10:00:00.000Z"
}
```

#### PUT /profile
Update user profile (currently supports profile image only).

**Headers**: 
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request**:
```json
{
  "profileImage": "data:image/png;base64,..." // or null to remove
}
```

**Response**: Same as GET /profile

### Code Changes

1. **User Storage** (`src/lib/server/users.js`)
   - Added `profileImage` field to user objects

2. **Profile API** (`src/routes/profile/+server.js`)
   - New endpoint for managing user profile data
   - GET handler to retrieve profile
   - PUT handler to update profile image

3. **Dashboard** (`src/lib/pages/DashboardMain.svelte`)
   - Profile dropdown menu with upload/remove options
   - File input for selecting images
   - Image preview in profile circle
   - Click-outside handler to close menu

4. **Files Page** (`src/routes/files/+page.svelte`)
   - Loads user profile on mount
   - Displays profile image in comment avatars for current user
   - Falls back to initial letter for users without images

5. **Registration** (`src/routes/register/+server.js`)
   - New users have `profileImage: null` by default

## Future Enhancements
- Store images in a file system or cloud storage instead of base64 in memory
- Allow viewing other users' profile images in comments
- Add image cropping/resizing before upload
- Add profile settings page for more user customization
- Support for profile names and bio
