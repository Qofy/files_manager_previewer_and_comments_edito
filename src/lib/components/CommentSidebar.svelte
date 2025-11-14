<script>
  import { createEventDispatcher } from 'svelte';

  export let commentsState = [];
  export let commentText = '';
  export let selectedFile = null;
  export let profileImage = null;
  export let currentUsername = null;
  export let readOnly = false; // Add read-only mode support

  const dispatch = createEventDispatcher();

  $: sortedComments = commentsState
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  $: canSend = commentText.trim().length > 0 && !readOnly;

  function handleSendComment() {
    if (readOnly) return;
    dispatch('sendComment', { text: commentText });
  }

  function handleCommentClick(comment) {
    // Dispatch event to scroll to either highlight or comment location
    if (comment.highlightId) {
      dispatch('scrollToHighlight', { highlightId: comment.highlightId });
    } else {
      dispatch('scrollToComment', { comment });
    }
  }
</script>

<aside class="comment-sidebar">
  <header>
    <h3>Comments</h3>
    {#if sortedComments.length > 0}
      <span class="comment-count">{sortedComments.length} {sortedComments.length === 1 ? 'comment' : 'comments'}</span>
    {/if}
  </header>
  <div class="comments">
    {#if sortedComments.length === 0}
      <div class="no-comments">
        <i class="fas fa-comments"></i>
        <p>No comments yet</p>
        <small>Select a file and click to add comments</small>
      </div>
    {:else}
      {#each sortedComments as comment}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div 
          class="comment clickable"
          on:click={() => handleCommentClick(comment)}
          on:keydown={(e) => e.key === 'Enter' && handleCommentClick(comment)}
          role="button"
          tabindex="0"
        >
          <div class="comment-header">
            <div class="comment-avatar" style={profileImage && comment.user_id === currentUsername ? `background-image: url(${profileImage}); background-size: cover; background-position: center;` : ''}>
              {#if !profileImage || comment.user_id !== currentUsername}
                {(comment.user_id || 'A')[0].toUpperCase()}
              {/if}
            </div>
            <div class="comment-meta">
              <strong class="comment-user">{comment.user_id || 'Anonymous'}</strong>
              <span class="comment-time">{new Date(comment.created_at).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}</span>
            </div>
            <span class="comment-page">p.{comment.page}</span>
          </div>
          <div class="comment-text">
            {comment.text}
          </div>
        </div>
      {/each}
    {/if}
  </div>
  {#if !readOnly}
    <div class="new-comment">
      <textarea
        bind:value={commentText}
        placeholder={selectedFile ? "Add a comment… (click a spot in the file first)" : "Select a file to add comments"}
        disabled={!selectedFile}
      ></textarea>
      <button on:click={handleSendComment} disabled={!canSend || !selectedFile}>Send</button>
    </div>
  {:else}
    <div class="read-only-notice">
      <i class="fas fa-lock"></i>
      <span>View-only mode</span>
    </div>
  {/if}
</aside>

<style>
  .comment-sidebar {
    width: 280px;
    border-left: 1px solid #eee;
    display: flex;
    flex-direction: column;
    background: #fff;
    flex-shrink: 0;
    height: 100vh;
    overflow: hidden;
  }
  
  .comment-sidebar header {
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .comment-sidebar header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #0c5489;
  }
  
  .comment-count {
    font-size: 12px;
    color: #666;
    background: #f0f6fa;
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: 500;
  }
  
  .comments {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  
  .no-comments {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #888;
  }
  
  .no-comments i {
    font-size: 48px;
    color: #ddd;
    margin-bottom: 16px;
  }
  
  .no-comments p {
    margin: 0 0 8px 0;
    font-weight: 600;
    color: #666;
  }
  
  .no-comments small {
    color: #999;
    font-size: 12px;
  }
  
  .comment {
    padding: 12px;
    border-bottom: 1px solid #f2f2f2;
  }
  
  .comment:hover {
    background: #f9f9f9;
  }

  .comment.clickable {
    cursor: pointer;
  }

  .comment.clickable:hover {
    background: #e6f3ff;
  }
  
  .comment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .comment-avatar {
    width: 29px;
    height: 29px;
    border-radius: 50%;
    background: #0c5489;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 20px;
    flex-shrink: 0;
  }
  
  .comment-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  
  .comment-user {
    font-size: 10px;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .comment-time {
    font-size: 9px;
    color: #999;
  }
  
  .comment-page {
    background: #e6f3ff;
    color: #0c5489;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .comment-text {
    font-size: 16px;
    color: #555;
    font-weight: 600;
    line-height: 1.5;
    word-wrap: break-word;
  }
  
  .new-comment {
    padding: 8px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  
  .new-comment textarea {
    flex: 1;
    resize: vertical;
    min-height: 42px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .new-comment textarea:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
    color: #999;
  }

  .new-comment button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #0c5489;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
  }

  .new-comment button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .new-comment button:hover:not(:disabled) {
    background: #094166;
  }

  .read-only-notice {
    padding: 16px;
    background: #f7f9fb;
    border-top: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #666;
    font-size: 14px;
  }

  .read-only-notice i {
    color: #0c5489;
  }
</style>
