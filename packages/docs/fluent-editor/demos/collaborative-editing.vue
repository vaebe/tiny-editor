<script setup lang="ts">
import type FluentEditor from '@opentiny/fluent-editor'
import type { Range } from '@opentiny/fluent-editor'
import Html2Canvas from 'html2canvas'
import katex from 'katex'
import { onMounted, ref } from 'vue'
import 'quill-table-up/index.css'
import 'quill-table-up/table-creator.css'
import 'katex/dist/katex.min.css'

window.katex = katex
window.Html2Canvas = Html2Canvas

let editor: FluentEditor
const editorRef = ref<HTMLElement>()
let simulateInterval: NodeJS.Timeout | null = null
let charCount = 0
const MAX_CHARS = 500

const TOOLBAR_CONFIG = [
  ['undo', 'redo', 'format-painter', 'clean'],
  [
    { header: [false, 1, 2, 3, 4, 5, 6] },
    { size: ['12px', '14px', '16px', '18px', '20px', '24px', '32px'] },
    { font: [] },
    { 'line-height': ['1', '1.15', '1.5', '2', '2.5', '3'] },
  ],
  ['bold', 'italic', 'underline', 'strike', 'code'],
  [{ color: [] }, { background: [] }],
  [
    { align: ['', 'center', 'right', 'justify'] },
    { list: 'ordered' },
    { list: 'bullet' },
    { list: 'check' },
    { indent: '+1' },
    { indent: '-1' },
  ],
  [{ script: 'sub' }, { script: 'super' }],
  ['link', 'blockquote', 'code-block', 'divider'],
  ['image', 'file', 'emoji', 'video', 'formula'],
  [{ 'table-up': [] }, 'screenshot', 'fullscreen'],
]

const ROOM_NAME = `tiny-editor-document-demo-roomName`

const CURSOR_CLASSES = {
  SELECTION_CLASS: 'ql-cursor-selections',
  CARET_CONTAINER_CLASS: 'ql-cursor-caret-container',
  CARET_CLASS: 'ql-cursor-caret',
  FLAG_CLASS: 'ql-cursor-flag',
  NAME_CLASS: 'ql-cursor-name',
}

function simulateTyping() {
  if (simulateInterval) {
    // If simulation is already running, stop it
    clearInterval(simulateInterval)
    simulateInterval = null
    const button = document.getElementById('simulate-btn')
    if (button) {
      button.textContent = '开始模拟打字'
    }
    return
  }

  // Focus the editor to ensure it's in input state
  if (editor) {
    editor.focus()
  }

  // Reset character count
  charCount = 0

  // Start simulation
  simulateInterval = setInterval(() => {
    if (!editor || charCount >= MAX_CHARS) {
      if (simulateInterval) {
        clearInterval(simulateInterval)
        simulateInterval = null
      }
      const button = document.getElementById('simulate-btn')
      if (button) {
        button.textContent = '开始模拟打字'
      }
      return
    }

    // Get current cursor position
    const selection = editor.getSelection()
    if (!selection) return

    // Generate random content to insert
    const randomChars = 'abcdefghijklmnopqrstuvwxyz 你好，我是中国人'
    const randomChar = randomChars.charAt(Math.floor(Math.random() * randomChars.length))

    // Insert character at cursor position
    editor.insertText(selection.index, randomChar)

    // Move cursor more naturally
    // Get the current text length to prevent moving beyond content
    const textLength = editor.getLength()

    // After inserting character, cursor should be at selection.index + 1
    let newIndex = selection.index + 1

    // Sometimes move cursor to simulate natural typing behavior
    const shouldMoveCursor = Math.random() < 0.3 // 30% chance to move cursor
    if (shouldMoveCursor) {
      // Move cursor within a reasonable range (-5 to +5 positions)
      const moveRange = Math.floor(Math.random() * 11) - 5 // -5 to +5
      newIndex = Math.max(0, Math.min(textLength, newIndex + moveRange))
    }

    editor.setSelection(newIndex, 0)

    // Update character count
    charCount++

    // Update button text to show progress
    const button = document.getElementById('simulate-btn')
    if (button) {
      button.textContent = `模拟打字中... (${charCount}/${MAX_CHARS})`
    }

    // Stop when we reach the limit
    if (charCount >= MAX_CHARS) {
      if (simulateInterval) {
        clearInterval(simulateInterval)
        simulateInterval = null
      }
      if (button) {
        button.textContent = '开始模拟打字'
      }
    }
  }, 1000) // Insert a character every 200ms
}

onMounted(() => {
  Promise.all([
    import('@opentiny/fluent-editor'),
    import('quill-table-up'),
  ]).then(
    ([
      { default: FluentEditor, generateTableUp, CollaborationModule },
      { defaultCustomSelect, TableMenuContextmenu, TableSelection, TableUp },
    ]) => {
      if (!editorRef.value) return

      FluentEditor.register(
        { 'modules/table-up': generateTableUp(TableUp) },
        true,
      )
      FluentEditor.register(
        'modules/collaborative-editing',
        CollaborationModule,
        true,
      )

      const Delta = FluentEditor.import('delta')
      editor = new FluentEditor(editorRef.value, {
        theme: 'snow',
        modules: {
          'toolbar': TOOLBAR_CONFIG,
          'file': true,
          'emoji': true,
          'uploader': {
            mimetypes: ['image/*'],
            handler(range: Range, files: File[]) {
              const urls = [
                'https://developer.mozilla.org/static/media/edge.741dffaf92fcae238b84.svg',
                'https://developer.mozilla.org/static/media/chrome.5e791c51c323fbb93c31.svg',
              ]
              return files.map(() => urls[Math.floor(Math.random() * urls.length)])
            },
          },
          'table-up': {
            customSelect: defaultCustomSelect,
            selection: TableSelection,
            selectionOptions: {
              tableMenu: TableMenuContextmenu,
            },
          },
          'collaborative-editing': {
            provider: {
              type: 'websocket',
              options: {
                serverUrl: 'ws://localhost:1234',
                roomName: ROOM_NAME,
              },
            },
            awareness: {
              state: {
                name: `userId:${Math.random().toString(36).substring(2, 15)}`,
                color: `rgb(${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)})`,
              },
            },
            cursors: {
              template: `
                  <span class="${CURSOR_CLASSES.SELECTION_CLASS}"></span>
                  <span class="${CURSOR_CLASSES.CARET_CONTAINER_CLASS}">
                    <span class="${CURSOR_CLASSES.CARET_CLASS}"></span>
                  </span>
                  <div class="${CURSOR_CLASSES.FLAG_CLASS}">
                    <small class="${CURSOR_CLASSES.NAME_CLASS}"></small>
                  </div>
              `,
              hideDelayMs: 500,
              hideSpeedMs: 300,
              transformOnTextChange: true,
            },
          },
        },
      })
    },
  )
})
</script>

<template>
  <div>
    <button
      id="simulate-btn"
      style="margin-bottom: 10px;"
      @click="simulateTyping"
    >
      开始模拟打字
    </button>
    <div id="editor" ref="editorRef" />
  </div>
</template>

<style lang="scss">
.ql-editor {
  padding-top: 28px !important;
}
.ql-cursor-flag {
  border-radius: 4px;
  display: flex;
  align-items: center;
  z-index: 9999 !important;
}
.ql-cursor-name {
  color: white !important;
  font-size: 20px;
}
</style>
