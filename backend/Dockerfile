# Use an official, lightweight Python image
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy dependencies and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your actual application code into the container
COPY . .

# Tell Docker which port Uvicorn will run on
EXPOSE 8000

# The exact command the container runs when it starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
