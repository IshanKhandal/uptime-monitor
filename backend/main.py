from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
from pydantic import BaseModel
import urllib.request
import urllib.error
import time

SQLALCHEMY_DATABASE_URL = "sqlite:///./uptime.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    url = Column(String, unique=True, index=True)

class PingHistory(Base):
    __tablename__ = "ping_history"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    response_time_ms = Column(Float)
    status_code = Column(Integer)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="Uptime Monitor API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def ping_single(service_id: int, url: str, db: Session):
    start_time = time.time()
    status_code = 500
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            status_code = response.getcode()
    except urllib.error.HTTPError as e:
        status_code = e.code
    except Exception:
        status_code = 500
    response_time_ms = round((time.time() - start_time) * 1000, 2)
    ping_log = PingHistory(service_id=service_id, response_time_ms=response_time_ms, status_code=status_code)
    db.add(ping_log)
    db.commit()
    return ping_log

def ping_services():
    db = SessionLocal()
    services = db.query(Service).all()
    for service in services:
        ping_single(service.id, service.url, db)
    db.close()
    print(f"Pinger executed across {len(services)} services.")

@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(ping_services, "interval", seconds=60)
    scheduler.start()

class ServiceCreate(BaseModel):
    name: str
    url: str

@app.post("/services/")
def add_service(service: ServiceCreate, db: Session = Depends(get_db)):
    db_service = Service(name=service.name, url=service.url)
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@app.get("/services/")
def get_all_services(db: Session = Depends(get_db)):
    return db.query(Service).all()

@app.delete("/services/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.query(PingHistory).filter(PingHistory.service_id == service_id).delete()
    db.delete(service)
    db.commit()
    return {"message": "Deleted"}

@app.post("/ping/{service_id}")
def manual_ping(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    result = ping_single(service.id, service.url, db)
    return {"status_code": result.status_code, "response_time_ms": result.response_time_ms}

@app.get("/history/{service_id}")
def get_service_history(service_id: int, db: Session = Depends(get_db)):
    return db.query(PingHistory).filter(PingHistory.service_id == service_id).order_by(PingHistory.timestamp.desc()).limit(50).all()
