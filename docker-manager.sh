#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' 

echo "================================"
echo "Phishing Guard Docker Service Manager"
echo "================================"
echo ""

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running${NC}"
        exit 1
    fi
}

start_services() {
    echo -e "${YELLOW}Starting services with Docker Compose...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✓${NC} Services started"
    status_services
}

start_dev() {
    echo -e "${YELLOW}Starting services in development mode...${NC}"
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
}

stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose stop
    echo -e "${GREEN}✓${NC} Services stopped"
}

restart_services() {
    echo -e "${YELLOW}Restarting services...${NC}"
    docker-compose restart
    echo -e "${GREEN}✓${NC} Services restarted"
    status_services
}

rebuild_services() {
    echo -e "${YELLOW}Rebuilding services...${NC}"
    docker-compose build --no-cache
    echo -e "${GREEN}✓${NC} Services rebuilt"
}

status_services() {
    echo ""
    echo -e "${YELLOW}Service Status:${NC}"
    docker-compose ps
    echo ""
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose logs -f
    elif [ "$service" == "backend" ] || [ "$service" == "frontend" ] || [ "$service" == "database" ]; then
        docker-compose logs -f $service
    else
        echo -e "${RED}Error: Invalid service name. Use 'backend', 'frontend', or 'database'${NC}"
        exit 1
    fi
}

cleanup() {
    echo -e "${YELLOW}Cleaning up containers, networks, and volumes...${NC}"
    read -p "This will remove all containers and volumes. Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        echo -e "${GREEN}✓${NC} Cleanup complete"
    else
        echo -e "${YELLOW}Cleanup cancelled${NC}"
    fi
}

shell() {
    local service=$1
    if [ -z "$service" ]; then
        echo -e "${RED}Error: Please specify service (backend or frontend)${NC}"
        exit 1
    fi
    
    if [ "$service" == "backend" ]; then
        docker-compose exec backend /bin/bash
    elif [ "$service" == "frontend" ]; then
        docker-compose exec frontend /bin/sh
    elif [ "$service" == "database" ]; then
        docker-compose exec database mysql -u ${DB_USER:-dacon} -p${DB_PASSWORD:-dacon0211!} ${DB_NAME:-dacondb}
    else
        echo -e "${RED}Error: Invalid service name. Use 'backend', 'frontend', or 'database'${NC}"
        exit 1
    fi
}

check_docker

case "$1" in
    start)
        start_services
        ;;
    dev)
        start_dev
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    rebuild)
        rebuild_services
        ;;
    status)
        status_services
        ;;
    logs)
        show_logs $2
        ;;
    cleanup)
        cleanup
        ;;
    shell)
        shell $2
        ;;
    *)
        echo "Usage: $0 {start|dev|stop|restart|rebuild|status|logs [service]|cleanup|shell [service]}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services in production mode"
        echo "  dev      - Start all services in development mode (hot reload)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  rebuild  - Rebuild all Docker images"
        echo "  status   - Show status of all services"
        echo "  logs     - Show logs for all services or specific service"
        echo "  cleanup  - Remove all containers, networks, and volumes"
        echo "  shell    - Enter shell of a specific service"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 dev"
        echo "  $0 logs backend"
        echo "  $0 shell backend"
        exit 1
esac

exit 0
