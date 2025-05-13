<script lang="ts" setup>
import type FluentEditor from '@opentiny/fluent-editor'
import type { ShallowRef } from 'vue'
import { onMounted, useTemplateRef } from 'vue'

async function createEditor(domRef: Readonly<ShallowRef<HTMLDivElement | null>>, user: { name: string, color: string }) {
  // ssr compat, reference: https://vitepress.dev/guide/ssr-compat#importing-in-mounted-hook
  if (!domRef.value) {
    return Promise.reject(new Error('editorRef is not available'))
  }

  try {
    const { default: FluentEditor } = await import('@opentiny/fluent-editor')

    const editor = new FluentEditor(domRef.value, {
      theme: 'snow',
      modules: {
        'yjs-quill': {
          docName: 'collaborative-doc',
          wsUrl: 'ws://localhost:3000',
          user,
        },
      },
    })

    // 监听用户状态变化
    editor.on('awareness.change', (changes) => {
      console.log('用户状态变化:', changes)
    })

    // 监听文档同步状态
    editor.on('sync', (isSynced) => {
      console.log('文档同步状态:', isSynced)
    })

    return Promise.resolve(editor)
  }
  catch (error) {
    return Promise.reject(error)
  }
}

let editor1: FluentEditor
const editor1Ref = useTemplateRef('editor1Ref')
let editor2: FluentEditor
const editor2Ref = useTemplateRef('editor2Ref')

onMounted(() => {
  createEditor(editor1Ref, { name: '用户A', color: '#ff0000' }).then((fluentEditor) => {
    editor1 = fluentEditor
  })
  createEditor(editor2Ref, { name: '用户B', color: '#00ff00' }).then((fluentEditor) => {
    editor2 = fluentEditor
  })
})
</script>

<template>
  <div ref="editor1Ref" />
  <p style="margin: 10px 0;" />
  <div ref="editor2Ref" />
</template>

<style>

</style>
