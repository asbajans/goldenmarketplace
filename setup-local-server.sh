#!/bin/bash

# Golden Crafters - Local Server Quick Setup Script
# Ubuntu 22 + Portainer + CasaOS üzerinde çalışacak

echo "🚀 Golden Crafters - Local Server Setup"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Bu script Ubuntu 22 sunucunda çalıştırılmalıdır!${NC}"
echo ""

# Check if running on Ubuntu
if [ ! -f /etc/os-release ]; then
    echo -e "${RED}Error: /etc/os-release not found. Ubuntu olmalısın!${NC}"
    exit 1
fi

# Source the os-release file
. /etc/os-release

if [[ "$ID" != "ubuntu" ]]; then
    echo -e "${RED}Error: Bu script sadece Ubuntu üzerinde çalışır!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Ubuntu detected${NC}"
echo ""

# 1. Check Docker
echo -e "${YELLOW}Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found!${NC}"
    echo "Kurulum: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# 2. Check Docker Compose
echo -e "${YELLOW}Checking Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose not found!${NC}"
    echo "Kurulum: sudo apt-get install docker-compose"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# 3. Check Git
echo -e "${YELLOW}Checking Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git not found!${NC}"
    echo "Kurulum: sudo apt-get install git"
    exit 1
fi
echo -e "${GREEN}✓ Git installed${NC}"

echo ""
echo "========================================="
echo "✅ Tüm gereklilikler mevcut!"
echo "========================================="
echo ""

# Ask for configuration
echo -e "${YELLOW}Yapılandırma için bilgi gir:${NC}"
echo ""

read -p "📦 GitHub reposu (owner/repo): " GITHUB_REPO
read -s -p "🔐 Database password (güçlü olsun!): " DB_PASSWORD
echo ""
read -s -p "🔐 Redis password: " REDIS_PASSWORD
echo ""
read -s -p "🔐 JWT Secret (uzun ve karmaşık): " JWT_SECRET
echo ""
read -p "🌐 Frontend URL (https://yourdomain.com): " FRONTEND_URL
read -p "📧 Stripe Secret Key (opsiyonel, Enter skip): " STRIPE_SECRET_KEY
read -p "📊 Stripe Public Key (opsiyonel, Enter skip): " STRIPE_PUBLIC_KEY

# Create .env file
echo ""
echo -e "${YELLOW}Creating .env file...${NC}"

cat > .env << EOF
# Database
DB_USER=golden_user
DB_PASSWORD=$DB_PASSWORD

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET

# Stripe (opsiyonel)
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLIC_KEY

# Frontend
FRONTEND_URL=$FRONTEND_URL

# API
API_URL=$FRONTEND_URL/api

# GitHub
GITHUB_REPO=$GITHUB_REPO
EOF

echo -e "${GREEN}✓ .env created${NC}"

# Create docker-compose-prod.yml if not exists
echo -e "${YELLOW}Preparing Docker Compose...${NC}"

# Update docker-compose.prod.yml with GitHub repo
sed -i "s|YOUR_GITHUB_USERNAME/golden-marketplace|$GITHUB_REPO|g" docker-compose.prod.yml

echo -e "${GREEN}✓ Docker Compose ready${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "========================================="
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Portainer'e gir: https://192.168.0.243:9443"
echo "2️⃣  Stacks → Add Stack"
echo "3️⃣  docker-compose.prod.yml'i upload et"
echo "4️⃣  .env dosyasından env variables'ı kopyala"
echo "5️⃣  Deploy et!"
echo ""
echo "⏱️  Kurulum süresi: ~5 dakika"
echo ""
echo "✅ Health check:"
echo "   curl https://yourdomain.com/api/health"
echo ""
echo "❓ Sorun yaşarsan:"
echo "   docker logs golden-api"
echo ""
