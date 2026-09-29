# Linux 部署（Ubuntu + Nginx）

这个项目由 Vite 静态前端、粤语朗读和整句翻译接口组成。线上用 Nginx 托管 `dist/`，把 `/api/tts` 与 `/api/translate` 转发到仅监听 `127.0.0.1:8787` 的 Node 进程。不要用 `vite dev` 或 `vite preview` 对外提供正式服务。

## 1. 准备

- 安装 Node.js 24 LTS、npm 和 Nginx；确认 `node -v`、`npm -v`、`nginx -v`。
- 准备指向服务器的域名，云平台安全组只开放 SSH、80 和 443；不要开放 8787。
- 建议建一个非 root 用户运行 API 服务，并让它对项目目录有读取权限，对 `.cache/tts` 有写入权限。
- 在 DeepSeek 官方渠道申请 API key，放在服务进程环境变量 `DEEPSEEK_API_KEY` 中。不要写入前端、Nginx 配置或 Git 仓库。

以下假设代码位于 `/srv/jyutping-memo`，服务用户是 `jyutping`。按实际路径和用户名替换。

```bash
cd /srv/jyutping-memo
npm ci
npm run build
npm prune --omit=dev
mkdir -p .cache/tts
sudo chown -R jyutping:jyutping .cache
```

每次更新代码后重新执行 `npm ci && npm run build && npm prune --omit=dev`，再重启 TTS 服务。不要把本地 Windows 的 `node_modules` 复制到 Linux。

## 2. systemd 运行朗读和翻译接口

创建 `/etc/systemd/system/jyutping-tts.service`。`ExecStart` 中的 Node 路径请先用 `command -v node` 确认。

```ini
[Unit]
Description=Jyutping Memo Cantonese TTS API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=jyutping
Group=jyutping
WorkingDirectory=/srv/jyutping-memo
Environment=NODE_ENV=production
Environment=PORT=8787
EnvironmentFile=/etc/jyutping-memo.env
ExecStart=/usr/bin/node /srv/jyutping-memo/server/tts-api.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now jyutping-tts
sudo systemctl status jyutping-tts
curl -i 'http://127.0.0.1:8787/api/tts'
```

最后一个请求缺少文字，应返回 `400`，用来确认进程已启动。实际朗读还依赖服务器能访问上游语音服务；若返回 `502`，用 `journalctl -u jyutping-tts -n 100 --no-pager` 查看错误。整句翻译需要服务能连接 `api.deepseek.com`。把 `DEEPSEEK_API_KEY=...` 放入 `/etc/jyutping-memo.env`，限制该文件仅服务用户可读。

## 3. Nginx 托管前端并转发接口

以下为站点配置示例，替换域名。`limit_req_zone` 需要放在 Nginx 的 `http` 上下文中；Ubuntu 的 `sites-enabled` 通常在该上下文内引入。

```nginx
limit_req_zone $binary_remote_addr zone=jyutping_tts:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=jyutping_translate:10m rate=1r/3s;

server {
    listen 80;
    server_name example.com;
    root /srv/jyutping-memo/dist;
    index index.html;

    location = /api/tts {
        limit_req zone=jyutping_tts burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8787;
        proxy_read_timeout 45s;
    }

    location = /api/translate {
        limit_req zone=jyutping_translate burst=3 nodelay;
        limit_req_status 429;
        client_max_body_size 8k;
        proxy_pass http://127.0.0.1:8787;
        proxy_read_timeout 35s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

确保 Nginx 用户有权限读取项目路径中的 `dist/`，然后运行 `sudo nginx -t && sudo systemctl reload nginx`。为域名配置 HTTPS 证书和自动续期，并确认 HTTP 自动跳转到 HTTPS。上线后检查首页、课程、歌词搜索、朗读以及两个 API；浏览器开发者工具中不应有混合内容或接口错误。翻译接口会消耗 DeepSeek 额度，保持限流并观察调用量。

## 4. 需要留意的现有依赖

- 学习记录在浏览器 `localStorage` 中。换设备、清理浏览器数据或无痕模式不会同步记录；服务器没有学习记录数据库。
- 粤语歌词搜索由浏览器直接访问 LRCLIB。用户网络无法访问 LRCLIB 时，搜索会失败；歌词的可用性与版权规则需按实际公开服务条款核对。
- 朗读依赖 `msedge-tts` 使用的上游语音服务。云服务器必须能连通该服务，且公开部署时应保留接口限流，观察流量和错误日志。
- 前端构建目前有较大的 JavaScript 包；低带宽用户首次加载可能较慢，可在后续拆包优化。
