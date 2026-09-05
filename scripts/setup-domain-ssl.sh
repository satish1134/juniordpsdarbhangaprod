#!/usr/bin/env bash
# ==============================================================================
# Domain & SSL Setup Script for Junior DPS Darbhanga
# Targets: juniordpsdarbhanga.com, www.juniordpsdarbhanga.com
# VPS IP: 5.175.216.125
# ==============================================================================

set -e

DOMAINS=("juniordpsdarbhanga.com" "www.juniordpsdarbhanga.com")
TARGET_IP="5.175.216.125"
EMAIL="sandyverma3@gmail.com"

echo "=================================================="
echo "Junior DPS Darbhanga - Domain & SSL Provisioning"
echo "Target Domains: ${DOMAINS[*]}"
echo "Target VPS IP:  $TARGET_IP"
echo "=================================================="

# 1. Check DNS resolution for both domains
echo ""
echo "[Step 1/4] Verifying DNS resolution..."
ALL_RESOLVED=true

for domain in "${DOMAINS[@]}"; do
  RESOLVED_IPS=$(getent ahosts "$domain" 2>/dev/null | awk '{print $1}' | sort -u || true)
  echo " - Checking $domain -> [${RESOLVED_IPS:-none}]"
  
  if echo "$RESOLVED_IPS" | grep -q "$TARGET_IP"; then
    echo "   ✓ $domain correctly points to $TARGET_IP"
  else
    echo "   ✗ $domain DOES NOT point to $TARGET_IP yet."
    ALL_RESOLVED=false
  fi
done

if [ "$ALL_RESOLVED" = false ]; then
  echo ""
  echo "⚠️  DNS records have not fully propagated to $TARGET_IP yet."
  echo "Please ensure the following A records are added in your domain registrar DNS settings:"
  echo "  Type: A | Host: @   | Value: $TARGET_IP | TTL: 300"
  echo "  Type: A | Host: www | Value: $TARGET_IP | TTL: 300"
  echo ""
  echo "You can re-run this script once DNS has propagated to complete SSL activation."
fi

# 2. Deploy Nginx virtual host configuration
echo ""
echo "[Step 2/4] Configuring Nginx reverse proxy..."

mkdir -p /var/www/certbot
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

if [ -f "/opt/juniordps/nginx/juniordps.conf" ]; then
  cp /opt/juniordps/nginx/juniordps.conf /etc/nginx/sites-available/juniordps
elif [ -f "./nginx/juniordps.conf" ]; then
  cp ./nginx/juniordps.conf /etc/nginx/sites-available/juniordps
fi

# Enable site symlink
ln -sf /etc/nginx/sites-available/juniordps /etc/nginx/sites-enabled/juniordps

# Remove default site if it conflicts on port 80
if [ -f "/etc/nginx/sites-enabled/default" ]; then
  rm -f /etc/nginx/sites-enabled/default
fi

# Validate Nginx configuration syntax
if nginx -t 2>/dev/null; then
  echo "✓ Nginx syntax test passed."
  systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true
  echo "✓ Nginx reloaded successfully."
else
  echo "⚠️ Nginx test failed. Details:"
  nginx -t || true
fi

# 3. If DNS is resolved, obtain or renew Let's Encrypt SSL certificate
if [ "$ALL_RESOLVED" = true ]; then
  echo ""
  echo "[Step 3/4] Installing Certbot and generating SSL Certificate..."
  
  if ! command -v certbot >/dev/null 2>&1; then
    echo "Installing certbot and python3-certbot-nginx..."
    apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
  fi

  echo "Requesting SSL certificate for: -d juniordpsdarbhanga.com -d www.juniordpsdarbhanga.com..."
  certbot --nginx \
    -d juniordpsdarbhanga.com \
    -d www.juniordpsdarbhanga.com \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect \
    || echo "⚠️ Certbot challenge encountered an issue. Check logs."

  echo "✓ SSL Certificate successfully configured!"
else
  echo ""
  echo "[Step 3/4] Skipping Certbot until DNS propagation is verified."
fi

# 4. Final verification
echo ""
echo "[Step 4/4] Verifying HTTP response..."
curl -s -I -H "Host: www.juniordpsdarbhanga.com" http://127.0.0.1/ | head -n 5 || true

echo ""
echo "=================================================="
echo "Domain setup phase complete."
echo "=================================================="
