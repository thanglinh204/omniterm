# OmniTerm Docker Deployment Guide (Web VPS)

Deploy the standalone OmniTerm Web terminal & SFTP gateway on any Linux VPS with Docker Compose.

---

## 1. Quick Start

The deployment package is completely self-contained in `installers/web/`.

```bash
# 1. Switch to installers/web directory
cd installers/web

# 2. Configure environment
cp .env.example .env

# 3. Launch container
docker compose up -d

# 4. Check status
docker compose ps
```

Access OmniTerm Web UI at:
**`http://<your-vps-ip>:3200`**

---

## 2. Reverse Proxy Nginx Configuration

Ensure WebSocket headers are forwarded for `/ws/ssh`:

```nginx
server {
    listen 80;
    server_name term.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name term.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/term.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/term.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ssh {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

## 3. Data Persistence & Backup

Data is persisted in the Docker volume `omniterm_data`.

### Backup
```bash
docker run --rm -v installers_web_omniterm_data:/data -v $(pwd):/backup alpine tar czvf /backup/omniterm_backup.tar.gz /data
```

### Restore
```bash
docker run --rm -v installers_web_omniterm_data:/data -v $(pwd):/backup alpine tar xzvf /backup/omniterm_backup.tar.gz -C /
```
