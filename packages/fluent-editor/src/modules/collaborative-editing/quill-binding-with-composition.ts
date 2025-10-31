import type { Awareness } from 'y-protocols/awareness'
import type * as Y from 'yjs'
import type FluentEditor from '../../fluent-editor'
import { QuillBinding } from 'y-quill'

/**
 * Custom QuillBinding that pauses outbound synchronization during IME composition
 * while still allowing inbound updates from remote collaborators.
 *
 * This implementation uses native DOM composition events with additional safeguards
 * to handle partial composition scenarios like "wo s我是".
 */
export class QuillBindingWithComposition {
  private ytext: Y.Text
  private quill: FluentEditor
  private awareness: Awareness
  private isDestroyed: boolean = false
  private originalQuillBinding: QuillBinding
  private compositionDepth: number = 0 // Handle nested composition events
  private pendingSync: boolean = false // Flag to handle composition end timing
  private compositionStartHandler: () => void
  private compositionEndHandler: () => void

  constructor(
    ytext: Y.Text,
    quill: FluentEditor,
    awareness: Awareness,
  ) {
    this.ytext = ytext
    this.quill = quill
    this.awareness = awareness

    // Setup native composition event listeners
    this.setupNativeCompositionDetection()

    // Create the standard QuillBinding first
    this.originalQuillBinding = new QuillBinding(ytext, quill as any, awareness)

    // Override the text-change handling with enhanced composition awareness
    this.setupCompositionAwareTextChange()
  }

  private setupNativeCompositionDetection(): void {
    const editorRoot = this.quill.root

    this.compositionStartHandler = () => {
      this.compositionDepth++
      this.pendingSync = false
    }

    this.compositionEndHandler = () => {
      this.compositionDepth--
      // Set a flag to indicate we just ended composition
      // This helps handle the brief window after compositionend
      this.pendingSync = true
      // Clear the pending flag after a short delay to allow final sync
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.pendingSync = false
        }
      }, 50)
    }

    editorRoot.addEventListener('compositionstart', this.compositionStartHandler)
    editorRoot.addEventListener('compositionend', this.compositionEndHandler)
  }

  private isInComposition(): boolean {
    // Check if we're currently in composition or just ended it
    return this.compositionDepth > 0 || this.pendingSync
  }

  private setupCompositionAwareTextChange(): void {
    // Remove the original text-change listener from QuillBinding
    const originalOnQuillChange = (this.originalQuillBinding as any).onQuillChange

    if (originalOnQuillChange) {
      // Remove the original listener
      this.quill.off('text-change', originalOnQuillChange)

      // Add our enhanced composition-aware listener
      this.quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
        if (this.isDestroyed) return

        // Only process user-initiated changes
        if (source !== 'user') {
          originalOnQuillChange.call(this.originalQuillBinding, delta, oldDelta, source)
          return
        }

        // Skip sync if in composition state
        if (this.isInComposition()) {
          return
        }

        // Call the original QuillBinding's onQuillChange method
        originalOnQuillChange.call(this.originalQuillBinding, delta, oldDelta, source)
      })
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Clean up native event listeners
    const editorRoot = this.quill.root
    editorRoot.removeEventListener('compositionstart', this.compositionStartHandler)
    editorRoot.removeEventListener('compositionend', this.compositionEndHandler)

    if (this.originalQuillBinding?.destroy) {
      this.originalQuillBinding.destroy()
    }
  }
}
