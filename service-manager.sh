#!/bin/bash

echo "================================"
echo "Phishing Guard Service Manager"
echo "================================"
echo""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' 

BACKEND_SERVICE="security-backend"
FRONTEND_SERVICE="security-frontend"

if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
fi

install_services() {
    echo -e "${YELLOW}Installing systemd services...${NC}"
    
    $SUDO cp /home/dacon/project/backend/security-backend.service /etc/systemd/system/
    echo -e "${GREEN}✓${NC} Backend service file copied"
    
    $SUDO cp /home/dacon/project/frontend/security-frontend.service /etc/systemd/system/
    echo -e "${GREEN}✓${NC} Frontend service file copied"
    
   $SUDO systemctl daemon-reload
    echo -e "${GREEN}✓${NC} Systemd reloaded"
    
    $SUDO systemctl enable $BACKEND_SERVICE
    $SUDO systemctl enable $FRONTEND_SERVICE
    echo -e "${GREEN}✓${NC} Services enabled"
    
    echo -e "${GREEN}Installation complete!${NC}"
}

start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    $SUDO systemctl start $BACKEND_SERVICE
    $SUDO systemctl start $FRONTEND_SERVICE
    echo -e "${GREEN}✓${NC} Services started"
    status_services
}

stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    $SUDO systemctl stop $BACKEND_SERVICE
    $SUDO systemctl stop $FRONTEND_SERVICE
    echo -e "${GREEN}✓${NC} Services stopped"
}

restart_services() {
    echo -e "${YELLOW}Restarting services...${NC}"
    $SUDO systemctl restart $BACKEND_SERVICE
    $SUDO systemctl restart $FRONTEND_SERVICE
    echo -e "${GREEN}✓${NC} Services restarted"
    status_services
}

status_services() {
    echo ""
    echo -e "${YELLOW}Backend Status:${NC}"
    $SUDO systemctl status $BACKEND_SERVICE --no-pager -l | head -n 15
    echo ""
    echo -e "${YELLOW}Frontend Status:${NC}"
    $SUDO systemctl status $FRONTEND_SERVICE --no-pager -l | head -n 15
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        echo -e "${RED}Error: Please specify service (backend or frontend)${NC}"
        return 1
    fi
    
    if [ "$service" == "backend" ]; then
        $SUDO journalctl -u $BACKEND_SERVICE -f
    elif [ "$service" == "frontend" ]; then
        $SUDO journalctl -u $FRONTEND_SERVICE -f
    else
        echo -e "${RED}Error: Invalid service name. Use 'backend' or 'frontend'${NC}"
    fi
}

case "$1" in
    install)
        install_services
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        status_services
        ;;
    logs)
        show_logs $2
        ;;
    *)
        echo "Usage: $0 {install|start|stop|restart|status|logs [backend|frontend]}"
        echo ""
        echo "Commands:"
        echo "  install  - Install and enable systemd services"
        echo "  start    - Start both services"
        echo "  stop     - Stop both services"
        echo "  restart  - Restart both services (use after code changes)"
        echo "  status   - Show status of both services"
        echo "  logs     - Show logs for specific service"
        echo ""
        echo "Examples:"
        echo "  $0 install"
        echo "  $0 restart"
        echo "  $0 logs backend"
        exit 1
esac

exit 0
