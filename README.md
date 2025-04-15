# simulator_dashboard

Admin dashboard for managing IoT device simulators

# Docker Setup for Development

This server uses Docker to provide a consistent MongoDB environment for development.

Steps to utilize: 
    1. Install Docker Desktop (and MongoDB if using Linux or Mac)
    2. Start the MongoDB container by running following in project root: docker-compose up -d

Useful Commands:
    Stop containers: docker-compose down
    View logs: docker-compose logs -f mongodb
    Reset database: docker-compose down -v (removes volumes)