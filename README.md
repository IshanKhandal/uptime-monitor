# Uptime Monitor

A production-grade full-stack DevOps tool that actively monitors HTTP services, logs response times and status codes into a persistent database, and visualizes real-time health metrics on a live dashboard.

Live Demo: https://uptime-monitor-ui.onrender.com
API Docs: https://uptime-monitor-api-tz55.onrender.com/docs

---

## What It Does

- Pings every registered service every 60 seconds automatically via a background scheduler
- Logs response time and HTTP status code for every ping
- Displays real-time latency charts, uptime percentage, and incident history
- Supports manual pings, service deletion, CSV export, and dark/light mode
- Fully containerized and deployed to cloud infrastructure

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Recharts |
| Backend | Python 3.11, FastAPI, APScheduler |
| Database | SQLite (local), PostgreSQL-ready (production) |
| Container | Docker, Docker Compose (Linux-based python:3.11-slim image) |
| CI/CD | GitHub Actions (automated build and syntax checks on every push) |
| Deployment | Render (cloud platform) / AWS EC2 (production guide below) |

---

## Architecture
Browser (React + TypeScript)

|

| REST API (HTTP/JSON)

v

FastAPI Backend (Python 3.11)

|

|-- APScheduler (background ping engine, 60s interval)

|-- SQLAlchemy ORM

|

v

SQLite / PostgreSQL Database

The backend runs inside a Linux-based Docker container (python:3.11-slim). The frontend is a static build served via CDN.

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 20+

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Running with Docker

```bash
docker-compose up --build
```

This starts both the backend API and frontend in Linux containers using Docker Compose.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /services/ | List all monitored services |
| POST | /services/ | Add a new service to monitor |
| DELETE | /services/{id} | Delete a service and its ping history |
| POST | /ping/{id} | Manually trigger an instant ping |
| GET | /history/{id} | Get ping history for a service (last 50) |

Full interactive API docs available at /docs via Swagger UI.

---

## CI/CD Pipeline

Every push to main triggers GitHub Actions to:

1. Set up Python 3.11 and install backend dependencies
2. Verify backend syntax compiles without errors
3. Set up Node 20 and install frontend dependencies
4. Build the React TypeScript frontend and verify it compiles

This ensures no broken code reaches the main branch.

---

## AWS EC2 Deployment

The application is containerized and designed to run on any Linux server. To deploy on AWS EC2:

```bash
# 1. Launch EC2 instance (Ubuntu 22.04, t2.micro or higher)
# 2. SSH into the instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Install Docker and Docker Compose
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo usermod -aG docker ubuntu

# 4. Clone the repository
git clone https://github.com/IshanKhandal/uptime-monitor.git
cd uptime-monitor

# 5. Start the application
sudo docker-compose up --build -d

# 6. Open port 8000 in your EC2 Security Group inbound rules
# API will be live at http://your-ec2-ip:8000
# Frontend will be live at http://your-ec2-ip:5173
```

---

## Linux and Container Notes

- The Docker image is built on python:3.11-slim (Debian Linux)
- All backend processes run inside the Linux container
- Docker Compose orchestrates multi-service startup
- The CI/CD pipeline runs on ubuntu-latest GitHub Actions runners
- Production deployment targets Linux-based cloud infrastructure

---

## Project Structure
uptime-monitor/

├── backend/

│   ├── main.py                 # FastAPI app + background ping engine

│   ├── requirements.txt        # Python dependencies

│   └── Dockerfile              # Linux container definition

├── frontend/

│   ├── src/

│   │   ├── App.tsx             # React dashboard (TypeScript)

│   │   └── index.css           # Global styles

│   ├── package.json

│   └── vite.config.ts

├── docker-compose.yml          # Multi-service orchestration

├── .github/

│   └── workflows/

│       └── ci.yml              # GitHub Actions CI pipeline

└── README.md

---

## Author

Ishan Sharma
B.Tech Computer Science and AI, JECRC Foundation, Jaipur
GitHub: @IshanKhandal