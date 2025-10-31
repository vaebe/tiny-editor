import type { Awareness } from 'y-protocols/awareness'
import type * as Y from 'yjs'
import type FluentEditor from '../../fluent-editor'
import { QuillBinding } from 'y-quill'

/**
 * Custom QuillBinding that pauses outbound synchronization during IME composition
 * while still allowing inbound updates from remote collaborators.
 *
 * This implementation intercepts Quill's emitter to ensure our detection logic
 * is properly triggered.
 */
export class QuillBindingWithComposition {
  private ytext: Y.Text
  private quill: FluentEditor
  private awareness: Awareness
  private isDestroyed: boolean = false
  private originalQuillBinding: QuillBinding
  private isComposing: boolean = false
  private compositionStartHandler: () => void
  private compositionEndHandler: () => void
  private originalEmit: Function | null = null

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

    // Intercept Quill's emitter before creating the binding
    this.interceptQuillEmitter()

    // Create the standard QuillBinding
    this.originalQuillBinding = new QuillBinding(ytext, quill as any, awareness)
  }

  private setupNativeCompositionDetection(): void {
    const editorRoot = this.quill.root

    this.compositionStartHandler = () => {
      this.isComposing = true
    }

    this.compositionEndHandler = () => {
      this.isComposing = false
    }

    editorRoot.addEventListener('compositionstart', this.compositionStartHandler)
    editorRoot.addEventListener('compositionend', this.compositionEndHandler)
  }

  private hasUnconfirmedInput(): boolean {
    // Use comprehensive detection: both native composition state and Quill's batch state
    const nativeComposing = this.isComposing
    const quillBatch = Boolean(this.quill.composition?.scroll?.batch)
    const quillComposing = Boolean(this.quill.composition?.isComposing)

    console.log('Detection:', {
      nativeComposing,
      quillBatch,
      quillComposing,
      shouldBlock: nativeComposing || quillBatch || quillComposing,
    })

    // Return true if any of the indicators show unconfirmed input
    return nativeComposing || quillBatch || quillComposing
  }

  private interceptQuillEmitter(): void {
    const emitter = this.quill.emitter
    if (!emitter) return

    // Store original emit method
    this.originalEmit = emitter.emit.bind(emitter)

    // Override emit method to intercept all text-related events
    emitter.emit = (eventName: string, ...args: any[]) => {
      if (this.isDestroyed) {
        return this.originalEmit!(eventName, ...args)
      }

      // Log all text-related events for debugging
      if (eventName.includes('text') || eventName.includes('change') || eventName.includes('edit')) {
        console.log(`Event: ${eventName}`, args)
      }

      // Intercept multiple possible text update events
      if (eventName === 'text-change'
        || eventName === 'editor-change'
        || eventName === 'change') {
        // For editor-change, the structure is different
        if (eventName === 'editor-change') {
          const [subEventName, delta, oldDelta, source] = args
          console.log(`editor-change sub-event: ${subEventName}`, { delta, oldDelta, source })

          // Only process user-initiated text changes
          if (subEventName === 'text-change' && source === 'user') {
            // Check for unconfirmed input
            if (this.hasUnconfirmedInput()) {
              console.log('Blocking editor-change text-change due to unconfirmed input')
              return // Don't emit the event
            }
          }
        }
        else {
          // For text-change and other events
          const [delta, oldDelta, source] = args
          console.log(`${eventName} event:`, { delta, oldDelta, source })

          // Only process user-initiated changes
          if (source === 'user') {
            // Check for unconfirmed input
            if (this.hasUnconfirmedInput()) {
              console.log(`Blocking ${eventName} due to unconfirmed input`)
              return // Don't emit the event
            }
          }
        }
      }

      // Emit the event normally
      return this.originalEmit!(eventName, ...args)
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    // Restore original emit method
    if (this.originalEmit && this.quill.emitter) {
      this.quill.emitter.emit = this.originalEmit
    }

    // Clean up native event listeners
    const editorRoot = this.quill.root
    editorRoot.removeEventListener('compositionstart', this.compositionStartHandler)
    editorRoot.removeEventListener('compositionend', this.compositionEndHandler)

    if (this.originalQuillBinding?.destroy) {
      this.originalQuillBinding.destroy()
    }
  }
}
