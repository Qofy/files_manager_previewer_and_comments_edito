# PDF Text Highlighting Feature

## Overview
This document explains how the PDF text highlighting and commenting feature was implemented in the file manager application.

## Feature Description
Users can select text in PDF files, highlight it with different colors, and add comments linked to those highlights.

## How It Works

### 1. Text Layer Rendering

**File**: `src/lib/components/FileViewer.svelte`

PDF.js provides a way to render a transparent text layer over the PDF canvas, making the text selectable.

```javascript
async function renderPage(pageNumber, scale) {
  // ... render canvas first ...
  
  // Create text layer container
  const textLayer = document.createElement('div');
  textLayer.className = 'textLayer';
  textLayer.style.setProperty('--scale-factor', scale); // Important for PDF.js
  container.appendChild(textLayer);
  
  // Render text layer using PDF.js
  const textContent = await page.getTextContent();
  window.pdfjsLib.renderTextLayer({
    textContentSource: textContent,
    container: textLayer,
    viewport: viewport,
    textDivs: []
  });
}
```

**Key Points:**
- Text layer is positioned absolutely over the canvas
- `--scale-factor` CSS variable must match the viewport scale
- Text spans are positioned to align exactly with PDF text
- Text is made transparent so users see the PDF canvas but can select text

### 2. Text Selection Detection

Added a `mouseup` event listener to detect when users finish selecting text:

```svelte
<div 
  bind:this={pagesEl} 
  on:mouseup={handleTextSelection}
  id="pages"
></div>
```

The handler captures selection details:

```javascript
function handleTextSelection(event) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText) return;
  
  // Find which page the selection is on
  const range = selection.getRangeAt(0);
  const pageDiv = range.startContainer.parentElement?.closest('.page');
  const pageNumber = parseInt(pageDiv.dataset.page, 10);
  
  // Calculate position relative to page (0-1 scale)
  const rect = pageDiv.getBoundingClientRect();
  const rangeRect = range.getBoundingClientRect();
  
  selectedTextData = {
    text: selectedText,
    page: pageNumber,
    x: (rangeRect.left - rect.left) / rect.width,
    y: (rangeRect.top - rect.top) / rect.height,
    rangeRect: {
      x: (rangeRect.left - rect.left) / rect.width,
      y: (rangeRect.top - rect.top) / rect.height,
      width: rangeRect.width / rect.width,
      height: rangeRect.height / rect.height
    }
  };
  
  // Show color picker dialog
  showHighlightDialog = true;
}
```

**Why relative coordinates?**
- Using percentages (0-1 scale) makes highlights work at any zoom level
- When zoom changes, highlights automatically scale with the page

### 3. Highlight Color Picker Dialog

A floating dialog appears when text is selected:

```svelte
{#if showHighlightDialog}
  <div 
    class="highlight-dialog"
    style="left: {highlightDialogPos.x}px; top: {highlightDialogPos.y}px;"
  >
    <button on:click={() => addHighlight('#ffeb3b')} class="color-btn yellow">
      <i class="fas fa-highlighter"></i> Yellow
    </button>
    <button on:click={() => addHighlight('#80ff80')} class="color-btn green">
      <i class="fas fa-highlighter"></i> Green
    </button>
    <button on:click={() => addHighlight('#ff9999')} class="color-btn red">
      <i class="fas fa-highlighter"></i> Red
    </button>
    <button on:click={() => addHighlight('#9999ff')} class="color-btn blue">
      <i class="fas fa-highlighter"></i> Blue
    </button>
    <button on:click={() => showHighlightDialog = false} class="cancel-btn">
      <i class="fas fa-times"></i> Cancel
    </button>
  </div>
{/if}
```

### 4. Creating and Storing Highlights

When user picks a color:

```javascript
function addHighlight(color = '#ffeb3b') {
  const highlight = {
    id: Date.now(),
    ...selectedTextData,  // text, page, position, rangeRect
    color,
    comment: null
  };
  
  highlights = [...highlights, highlight];
  renderHighlights();
  showHighlightDialog = false;
  
  // Tell parent component to create a linked comment
  dispatch('highlightCreated', { highlight });
}
```

**Highlight Data Structure:**
```javascript
{
  id: 1699999999999,           // Timestamp-based unique ID
  text: "Selected text...",     // The actual text that was highlighted
  page: 1,                      // Page number (1-indexed)
  x: 0.25,                      // X position (0-1 scale)
  y: 0.30,                      // Y position (0-1 scale)
  rangeRect: {                  // Bounding box of the selection
    x: 0.25,
    y: 0.30,
    width: 0.45,
    height: 0.02
  },
  color: '#ffeb3b',            // Highlight color
  comment: null                 // Linked comment ID (if any)
}
```

### 5. Rendering Highlight Overlays

Highlights are rendered as absolutely positioned div overlays:

```javascript
function renderHighlights() {
  // Remove old highlights
  pagesEl.querySelectorAll('.highlight-overlay').forEach(h => h.remove());
  
  // Render each highlight
  highlights.forEach(h => {
    const pageDiv = pagesEl.querySelector(`[data-page="${h.page}"]`);
    if (!pageDiv) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'highlight-overlay';
    overlay.style.left = h.rangeRect.x * 100 + '%';
    overlay.style.top = h.rangeRect.y * 100 + '%';
    overlay.style.width = h.rangeRect.width * 100 + '%';
    overlay.style.height = h.rangeRect.height * 100 + '%';
    overlay.style.backgroundColor = h.color;
    overlay.style.opacity = '0.3';
    overlay.dataset.highlightId = h.id;
    overlay.title = h.text;
    
    // Click handler to view associated comment
    overlay.addEventListener('click', () => {
      dispatch('highlightClick', { highlight: h });
    });
    
    pageDiv.appendChild(overlay);
  });
}
```

### 6. Linking Highlights to Comments

**In parent component** (`src/routes/files/+page.svelte`):

```javascript
function handleHighlightCreated(event) {
  const { highlight } = event.detail;
  
  // Pre-fill comment box with highlighted text
  commentText = `"${highlight.text}"\n\n`;
  
  // Set click position for comment pin
  lastClickPos = {
    page: highlight.page,
    x: highlight.x,
    y: highlight.y
  };
}

function handleHighlightClick(event) {
  const { highlight } = event.detail;
  
  // Find comment associated with this highlight
  const relatedComment = commentsState.find(c => c.highlightId === highlight.id);
  
  if (relatedComment) {
    // Scroll to comment in sidebar
    console.log('Related comment:', relatedComment);
  } else {
    // No comment yet, pre-fill with highlight text
    commentText = `"${highlight.text}"\n\n`;
  }
}
```

When comment is sent, include the highlight ID:

```javascript
async function handleSendComment(event) {
  const text = event.detail.text;
  const highlightId = event.detail.highlightId;
  
  const payload = {
    file_id: selectedFile.id,
    page: pos.page,
    x: pos.x,
    y: pos.y,
    text: text,
    scope,
    highlightId  // Links comment to highlight
  };
  
  // Send to server...
}
```

## CSS Styling

### Text Layer
```css
:global(.textLayer) {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  opacity: 0.2;
  line-height: 1.0;
  pointer-events: auto;
}

:global(.textLayer > span) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

:global(.textLayer ::selection) {
  background: rgba(0, 100, 255, 0.3);
}
```

### Highlight Overlays
```css
:global(.highlight-overlay) {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
  border-radius: 2px;
  transition: opacity 0.2s;
}

:global(.highlight-overlay:hover) {
  opacity: 0.5 !important;
}
```

### Highlight Dialog
```css
.highlight-dialog {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
  min-width: 150px;
}
```

## Dependencies

Added PDF.js text layer CSS in `src/app.html`:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf_viewer.min.css" />
```

## User Flow

1. **Open PDF**: User opens any PDF file in the viewer
2. **Select Text**: User clicks and drags to select text
3. **Choose Color**: Color picker dialog appears with 4 options
4. **Highlight Created**: Text is highlighted with chosen color
5. **Add Comment**: Comment box pre-fills with selected text
6. **View Later**: Click any highlight to see its associated comment

## Technical Decisions

### Why use relative coordinates?
- Highlights work at any zoom level
- Positions scale automatically when user zooms in/out
- More reliable than pixel-based positioning

### Why use DOM manipulation instead of Svelte components?
- PDF.js already manipulates DOM directly
- Mixing React-style and imperative DOM is common for canvas/PDF apps
- Better performance for many highlights (no re-rendering)

### Why separate text layer from canvas?
- Canvas doesn't support text selection
- Text layer provides native browser selection
- Users can copy text to clipboard

## Limitations & Future Enhancements

### Current Limitations:
- Highlights are stored in component state (not persisted to server)
- Multi-line selections show as single rectangle (not perfect for wrapped text)
- No highlight editing or deletion UI

### Possible Enhancements:
- Save highlights to server/database
- Support for multi-rectangle highlights (for text that wraps lines)
- Right-click context menu for highlight management
- Highlight editing (change color, delete)
- Search through highlighted text
- Export highlights as annotations

## Testing

To test the feature:
1. Start dev server: `npm run dev`
2. Login and navigate to files page
3. Upload or select a PDF file
4. Click to preview the PDF
5. Select any text in the PDF
6. Choose a highlight color
7. Add a comment (optional)
8. Click the highlight to see the linked comment

## Code Files Modified

1. **src/lib/components/FileViewer.svelte** - Main highlighting logic
2. **src/routes/files/+page.svelte** - Parent component integration
3. **src/app.html** - Added PDF.js CSS

## References

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [PDF.js Text Layer Example](https://mozilla.github.io/pdf.js/examples/)
- [Window.getSelection() API](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection)
