# TinyEditor 协同编辑后端服务

基于 Yjs 和 WebSocket 的实时协同编辑后端服务，支持多用户实时协作编辑，使用 MongoDB 进行文档持久化。

提供以下两种集成方式

## Docker Compose 一键启动(推荐)

创建 `docker-compose.yml` 文件，内容如下：

```yaml
services:
  mongodb:
    image: mongo:latest
    container_name: yjs-mongodb
    restart: always
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin
    volumes:
      - mongodb_data:/data/db

  websocket-server:
    image: yinlin124/collaborative-editor-backend:latest
    container_name: yjs-websocket-server
    restart: always
    ports:
      - '${PORT:-1234}:${PORT:-1234}'
    environment:
      HOST: ${HOST:-0.0.0.0} # 设置后端监听的网络接口
      PORT: ${PORT:-1234} # 默认 1234 端口，可以使用环境变量修改
      MONGODB_URL: ${MONGODB_URL:-mongodb://admin:admin@mongodb:27017/?authSource=admin}
      MONGODB_DB: ${MONGODB_DB:-tinyeditor} # 数据库名称
      MONGODB_COLLECTION: ${MONGODB_COLLECTION:-documents} # 集合名称
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

执行 `docker compose up` 启动容器，连接地址为 `wss://你的域名or服务器ip:1234`

> 如果你没有开启 https 则需要将 wss 替换 ws

## 通过 NPM 包集成

参考 [tiny-editor-collaborative-editor-backend-demo](https://github.com/vaebe/tiny-editor-collaborative-editor-backend-demo) 进行集成

## 开发指南

### mongodb

项目依赖 Mongo 数据库来持久化数据。如果您已有可用的 Mongo 数据库，可以跳过此节。

通过 docker 启动 Mongo 数据库

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin \
  -v mongodb_data:/data/db \
  mongo:latest
```

**修改 `.env`文件 `MONGODB_URL` 为正确的连接地址**，通过上述 docker 命令启动的服务修改为如下内容即可

```bash
MONGODB_URL=mongodb://admin:admin@localhost:27017/?authSource=admin
```

### scripts 命令解析

- 本地开发执行 `pnpm dev` 启动项目
- 执行 `pnpm build` 打包项目
- 执行 `pnpm pub` 发布 npm 包（需要先确认版本号）
- 执行 `docker build -t collaborative-editing-backend:latest .` 打包 docker 镜像

### 构建 docker 镜像

构建 `linux/amd64,linux/arm64` 并推送 docker hub

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t 你的dockerhub名字/collaborative-editor-backend:latest . --push
```

### MongoDB 持久化拓展

项目在 [`src/persistence/mongo.ts`](./src/persistence/mongo.ts) 类基于 [`y-mongodb-provider`](https://github.com/MaxNoetzold/y-mongodb-provider) 库 实现 MongoDB 持久化。

可参考 API 文档：[y-mongodb-provider API](https://github.com/MaxNoetzold/y-mongodb-provider?tab=readme-ov-file#api) 进行拓展。

### 自定义持久化接口

要支持其他数据库（如 PostgreSQL、Redis 等），需要实现 `Persistence` 接口

| 方法名       | 参数                            | 返回值          | 说明                                         |
| ------------ | ------------------------------- | --------------- | -------------------------------------------- |
| `bindState`  | `docName: string`, `doc: Y.Doc` | `Promise<void>` | 文档初始化时调用，加载历史状态并设置实时同步 |
| `writeState` | `docName: string`, `doc: Y.Doc` | `Promise<void>` | 手动保存文档状态（可选使用）                 |
| `close`      | -                               | `Promise<void>` | 服务器关闭时调用，清理资源                   |

### 更多社区持久化支持

[`adapter for Yjs`](https://github.com/search?q=adapter%20for%20Yjs&type=repositories)：

- [y-mongodb-provider](https://github.com/yjs/y-mongodb-provider)
- [y-redis](https://github.com/yjs/y-redis)
- [y-postgres](https://github.com/MaxNoetzold/y-postgresql)
