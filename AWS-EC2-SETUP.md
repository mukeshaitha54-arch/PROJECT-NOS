# AWS EC2 Setup Instructions

## 1. Launch EC2 Instance

- AMI: Ubuntu Server 24.04 LTS
- Instance Type: c7i-flex.large
- Storage: 30 GB gp3
- Security Group: Allow SSH (22), HTTP (80), HTTPS (443)

## 2. Allocate Elastic IP

- EC2 → Elastic IPs → Allocate
- Associate with your instance
- IP: 13.127.187.47 (update if different)

## 3. SSH into EC2

```bash
ssh -i your-key.pem ubuntu@13.127.187.47
```

## 4. Install Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io -y
# Install Docker Compose v2 (prevents KeyError: ContainerConfig)
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
mkdir -p ~/.docker/cli-plugins
ln -sf /usr/local/bin/docker-compose ~/.docker/cli-plugins/docker-compose
sudo usermod -aG docker ubuntu
exit
```

_Reconnect SSH after exiting_

## 5. Clone and Deploy

```bash
git clone https://github.com/mukeshaitha54-arch/PROJECT-NOS.git nos
cd nos
cp .env.example .env
# EDIT .env with real values (generate passwords with openssl rand -hex 32)
nano .env
./scripts/deploy-ec2.sh
```

## 6. Update Open Domains

- Go to open-domains.com
- Update A-record to your Elastic IP
