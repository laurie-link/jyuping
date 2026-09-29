# Linux 部署（Ubuntu + Nginx）

正式服务由 Nginx 托管 `dist/`，Node 进程提供 `/api/account/`、`/api/tts` 和 `/api/translate`。账号、登录会话、每个用户的练习进度都保存在服务器的 SQLite 数据库中；浏览器只保留 HttpOnly 登录 Cookie 和网络故障时尚未同步的临时进度。部署为单台服务器时直接使用此方案；多台 Node 实例需要共享数据库或迁移到集中数据库，不能各自使用一份 SQLite 文件。

## 1. 安装与构建

安装 Node.js 24 LTS、npm、Nginx。下面假设项目位于 `/srv/jyutping-memo`，服务用户为 `jyutping`：

```bash
cd /srv/jyutping-memo
npm ci
npm run build
npm test
npm prune --omit=dev
sudo install -d -o jyutping -g jyutping -m 0700 /var/lib/jyutping-memo
sudo install -d -o jyutping -g jyutping -m 0750 /srv/jyutping-memo/.cache/tts
```

`better-sqlite3` 含本机编译组件，必须在目标 Linux 服务器上执行 `npm ci`；不要复制 Windows 的 `node_modules`。每次更新代码后重新构建并重启服务。确保 Nginx 能读取 `dist/`。数据库目录必须可由服务用户写入，且不要放在会被部署脚本删除的目录里。

把 DeepSeek API key 放入 `/etc/jyutping-memo.env`：

```text
DEEPSEEK_API_KEY=在服务器上设置的密钥
```

用 `sudo chmod 0600 /etc/jyutping-memo.env` 限制权限。密钥不能进入前端或 Git。

## 2. systemd API 服务

创建 `/etc/systemd/system/jyutping-api.service`；先用 `command -v node` 确认 `ExecStart` 的路径。

```ini
[Unit]
Description=Jyutping Memo API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=jyutping
Group=jyutping
WorkingDirectory=/srv/jyutping-memo
Environment=NODE_ENV=production
Environment=PORT=8787
Environment=DATA_PATH=/var/lib/jyutping-memo/jyutping.sqlite
EnvironmentFile=/etc/jyutping-memo.env
ExecStart=/usr/bin/node /srv/jyutping-memo/server/tts-api.mjs
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now jyutping-api
sudo systemctl status jyutping-api
curl -i http://127.0.0.1:8787/api/account/session
```

最后一个请求应返回 `{"user":null}`。Node 只监听 `127.0.0.1:8787`，不要在防火墙开放该端口。

## 3. Nginx 与 HTTPS

以下示例放在 Nginx 的 `http` 上下文中，替换域名，并为域名配置有效的 HTTPS 证书和 HTTP 到 HTTPS 跳转。正式环境使用 `Secure` Cookie，HTTP 页面不能正常登录。

```nginx
limit_req_zone $binary_remote_addr zone=jm_auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=jm_translate:10m rate=1r/3s;
limit_req_zone $binary_remote_addr zone=jm_tts:10m rate=1r/s;

server {
    listen 443 ssl;
    server_name example.com;
    root /srv/jyutping-memo/dist;
    index index.html;
    # 在这里配置 ssl_certificate 与 ssl_certificate_key。

    location /api/account/ {
        client_max_body_size 5m;
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    location ~ ^/api/account/(login|register)$ {
        limit_req zone=jm_auth burst=10 nodelay;
        limit_req_status 429;
        client_max_body_size 8k;
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /api/translate {
        limit_req zone=jm_translate burst=3 nodelay;
        limit_req_status 429;
        client_max_body_size 8k;
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_read_timeout 35s;
    }

    location = /api/tts {
        limit_req zone=jm_tts burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8787;
        proxy_read_timeout 45s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

确认 `sudo nginx -t && sudo systemctl reload nginx` 成功。账号接口必须保持与网页同源；后端会校验修改请求的 `Origin` 与 `Host`。不要通过 CDN 缓存 `/api/account/`。

## 4. 数据备份与旧记录迁移

定期备份 `/var/lib/jyutping-memo/jyutping.sqlite`。SQLite 使用 WAL 模式，运行中不要只复制主 `.sqlite` 文件；可安装 `sqlite3` 命令行工具后使用在线备份：

```bash
sudo sqlite3 /var/lib/jyutping-memo/jyutping.sqlite ".backup '/安全备份目录/jyutping-$(date +%F).sqlite'"
```

把备份保存在服务器外，并定期演练恢复。迁移服务器时先停止 Node 服务，再复制数据库及其 WAL 相关文件，或使用上面的在线备份文件。不要把数据库提交到 Git。

旧版本机账号和进度仍留在原浏览器。用户用相同账号在新版页面注册或登录时，若服务器上的该账号尚无进度，页面会验证旧密码并自动导入。新密码和旧密码不同时，可展开“旧版密码和现在不同？”单独输入旧密码。不要清除旧浏览器数据。上线前先对数据库和旧浏览器数据分别做好备份。

歌词搜索由浏览器直接访问 LRCLIB，粤语朗读依赖上游语音服务，整句翻译需要服务器可访问 DeepSeek。这几项功能的外部依赖仍需在部署后逐一验证。
