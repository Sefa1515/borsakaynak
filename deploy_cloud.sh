#!/bin/bash
# ==============================================================================
# BORSAKAYNAK CLOUD VDS 1-CLICK AUTOMATED SETUP SCRIPT (UBUNTU 22.04 / 24.04)
# ==============================================================================
set -e

echo "=========================================================================="
echo "          🚀 BORSAKAYNAK CLOUD VDS AUTOMATED SETUP STARTING...           "
echo "=========================================================================="

# 1. System Updates
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx

# 2. Install Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pm2

# 3. Create Project Directory
APP_DIR="/var/www/borsakaynak.com"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# 4. Configure PM2 Process Manager
cd $APP_DIR
pm2 stop borsakaynak || true
pm2 start server.js --name "borsakaynak"
pm2 save
pm2 startup | tail -n 1 | bash || true

# 5. Configure Nginx Reverse Proxy
cat << 'EOF' | sudo tee /etc/nginx/sites-available/borsakaynak.conf
server {
    listen 80;
    server_name borsakaynak.com www.borsakaynak.com;

    root /var/www/borsakaynak.com;
    index index.html;

    # Anti-Cache Headers
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0, private";
    add_header Pragma "no-cache";

    # Proxy API Requests to Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static HTML Files
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/borsakaynak.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 6. Enable UFW Firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo "=========================================================================="
echo "   🎉 SUCCESS! BORSAKAYNAK IS NOW RUNNING 7/24 ON YOUR CLOUD VDS!      "
echo "=========================================================================="
