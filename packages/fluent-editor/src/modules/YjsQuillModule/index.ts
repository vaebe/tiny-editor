import type Quill from 'quill'
import type { Awareness } from 'y-protocols/awareness'
import type FluentEditor from '../../core/fluent-editor'
import { QuillBinding } from 'y-quill'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

export interface YjsQuillModuleOptions {
  docName: string
  wsUrl: string
  user: {
    name: string
    color: string
  }
}

export class YjsQuillModule {
  private ydoc: Y.Doc
  private provider: WebsocketProvider
  private awareness: Awareness
  private quill: Quill
  private binding: QuillBinding

  constructor(public fluentEditor: FluentEditor, public options: YjsQuillModuleOptions) {
    const { docName, wsUrl, user } = options

    this.ydoc = new Y.Doc()

    // 修复 WebsocketProvider 初始化
    this.provider = new WebsocketProvider(wsUrl, docName, this.ydoc)

    // 光标同步
    this.awareness = this.provider.awareness
    this.awareness.setLocalStateField('user', user)

    this.quill = fluentEditor

    this.binding = new QuillBinding(
      this.ydoc.getText('quill'),
      this.quill,
      this.awareness,
    )
  }

  destroy() {
    this.provider.destroy()
    this.ydoc.destroy()
    this.quill = null
  }
}
