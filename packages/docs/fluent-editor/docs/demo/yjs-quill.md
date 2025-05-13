# 协同编辑

YjsQuill 模块提供了实时协同编辑功能，支持多人同时编辑文档，并包含光标同步功能。

## 基础用法

:::demo src=demos/yjs-quill.vue
:::


## 后端服务

首先需要启动一个 WebSocket 服务器：

```js
const WebSocket = require('ws')
const { setupWSConnection } = require('y-websocket/bin/utils.js')
const http = require('http')

const server = http.createServer()
const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req)
})

server.listen(1234, () => {
  console.log('y-websocket server running on ws://localhost:1234')
})
```

## 多用户协作

要测试多用户协作，可以在不同浏览器或标签页中打开编辑器，使用不同的用户信息：

```js
// 用户A
const editorA = new FluentEditor('#editor', {
  modules: {
    'yjs-quill': {
      docName: 'collaborative-doc',
      wsUrl: 'ws://localhost:1234',
      user: {
        name: '用户A',
        color: '#ff0000'
      }
    }
  }
})

// 用户B
const editorB = new FluentEditor('#editor', {
  modules: {
    'yjs-quill': {
      docName: 'collaborative-doc',
      wsUrl: 'ws://localhost:1234',
      user: {
        name: '用户B',
        color: '#00ff00'
      }
    }
  }
})
```

## 事件监听

你可以监听协同编辑相关的事件：

```js
// 监听用户状态变化
editor.on('awareness.change', (changes) => {
  console.log('用户状态变化:', changes)
})

// 监听文档同步状态
editor.on('sync', (isSynced) => {
  console.log('文档同步状态:', isSynced)
})
```

## 注意事项

1. 确保 WebSocket 服务器正常运行
2. 不同用户使用不同的 `user.name` 和 `user.color` 以便区分
3. 同一文档的用户需要使用相同的 `docName`
4. 建议在生产环境中使用 HTTPS 和 WSS 协议 