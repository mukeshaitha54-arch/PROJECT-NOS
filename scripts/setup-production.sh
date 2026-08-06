#!/bin/bash
# NOS Production Setup Script for AWS EC2 t3.micro (Ubuntu 24.04)
# Run as root or with sudo

set -e

echo "Starting NOS Production Setup..."

# 1. Update and upgrade packages
echo "Updating apt packages..."
apt update && apt upgrade -y

# Disable unnecessary Ubuntu services to free RAM
echo "Disabling snapd, lxd, and unattended-upgrades..."
systemctl disable snapd || true
systemctl disable lxd || true
systemctl disable unattended-upgrades || true
systemctl stop snapd || true
systemctl stop lxd || true

# 2. Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh

# 3. Install Docker Compose plugin
# (Already included in modern Docker installation via get.docker.com)
apt-get install -y docker-compose-plugin

# 4. Add ubuntu user to docker group (if exists)
if id "ubuntu" &>/dev/null; then
    usermod -aG docker ubuntu
fi

# 5. Create 2GB swap
echo "Configuring 2GB swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
    echo "Swap file already exists."
fi

# 6. Sysctl tuning for low RAM / swap
echo "Tuning sysctl for swappiness..."
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
sysctl -p

# 7. Install fail2ban
echo "Installing Fail2Ban..."
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban

# 8. Set timezone
echo "Setting timezone to Asia/Kolkata..."
timedatectl set-timezone Asia/Kolkata

# 9. Create app directory
echo "Creating application directory at /opt/nos..."
mkdir -p /opt/nos
cd /opt/nos

echo "Setup complete. Reboot recommended."
