import logging
import colorlog


class CustomColoredFormatter(colorlog.ColoredFormatter):
    RESET = "\033[0m"
    WHITE = "\033[37m"
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"

    LEVEL_COLORS = {
        "DEBUG": CYAN,
        "INFO": GREEN,
        "WARNING": YELLOW,
        "ERROR": RED,
        "CRITICAL": RED,
    }

    def format(self, record):
        level_color = self.LEVEL_COLORS.get(record.levelname, self.WHITE)
        message = record.getMessage()
        message = message.replace("SAFE", f"{self.GREEN}SAFE{self.RESET}")
        message = message.replace("SUSPICIOUS", f"{self.YELLOW}SUSPICIOUS{self.RESET}")
        message = message.replace("DANGER", f"{self.RED}DANGER{self.RESET}")
        message = message.replace("ERROR", f"{self.RED}ERROR{self.RESET}")
        message = message.replace("WARNING", f"{self.YELLOW}WARNING{self.RESET}")

        formatted = f"{level_color}{record.levelname}{self.RESET}:     {self.BLUE}{record.name}{self.RESET}:{message}{self.RESET}"

        return formatted


def setup_colored_logging(logger_name):
    handler = logging.StreamHandler()
    handler.setFormatter(CustomColoredFormatter())

    logger = logging.getLogger(logger_name)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    return logger
