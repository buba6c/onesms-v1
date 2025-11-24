#!/bin/bash

# ONE SMS Deployment Script
# Author: ONE SMS Team
# Date: 2025-11-21

set -e

echo "🚀 Starting ONE SMS Deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build the application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Create logs directory
mkdir -p logs

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📥 PM2 not found globally. Using local PM2...${NC}"
    # Stop any existing processes
    npx pm2 delete onesms-frontend 2>/dev/null || true
    
    # Start the application
    echo -e "${YELLOW}🚀 Starting application with PM2...${NC}"
    npx pm2 start ecosystem.config.cjs
    
    # Save PM2 configuration
    npx pm2 save
    
    # Display status
    npx pm2 status
else
    echo -e "${GREEN}✓ PM2 found globally${NC}"
    # Stop any existing processes
    pm2 delete onesms-frontend 2>/dev/null || true
    
    # Start the application
    echo -e "${YELLOW}🚀 Starting application with PM2...${NC}"
    pm2 start ecosystem.config.cjs
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    echo -e "${YELLOW}🔧 Setting up PM2 startup...${NC}"
    pm2 startup || true
    
    # Display status
    pm2 status
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Application is running on http://localhost:3000"
echo ""
echo "PM2 Commands:"
echo "  - View logs:    pm2 logs onesms-frontend"
echo "  - View status:  pm2 status"
echo "  - Restart:      pm2 restart onesms-frontend"
echo "  - Stop:         pm2 stop onesms-frontend"
echo "  - Monitor:      pm2 monit"
echo ""
