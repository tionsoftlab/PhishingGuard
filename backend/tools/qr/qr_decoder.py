import base64
import io
import re
from typing import Dict, Any
import numpy as np
from PIL import Image
import cv2
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from utils.logging_config import setup_colored_logging

logger = setup_colored_logging(__name__)


def is_url(text: str) -> bool:
    url_pattern = re.compile(
        r"^(https?://|www\.)"
        r"|"
        r".*\.(com|net|org|edu|gov|mil|co|kr|jp|cn|io|ai|me|app|dev|tech|info|biz|tv|cc|us|uk|de|fr|ru|in|au|br|ca|mx|es|it|nl|se|no|dk|fi|ch|at|be|pl|cz|ie|pt|gr|tr|il|za|ar|cl|pe|ve|co\.kr|or\.kr|ac\.kr|go\.kr|ne\.kr)",
        re.IGNORECASE,
    )

    simple_domain_pattern = re.compile(r"^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}", re.IGNORECASE)

    if url_pattern.search(text):
        return True
    if simple_domain_pattern.match(text):
        return True

    return False


def decode_qr_from_base64(base64_image: str) -> Dict[str, Any]:
    try:
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]

        image_bytes = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(image_bytes))

        if image.mode != "RGB":
            image = image.convert("RGB")

        img_array = np.array(image, dtype=np.uint8)

        try:
            from pyzbar import pyzbar

            decoded_objects = pyzbar.decode(img_array)
            if decoded_objects:
                qr_data = decoded_objects[0].data.decode("utf-8")
                logger.info(f"pyzbar로 QR 디코딩 성공: {qr_data[:50]}...")

                if is_url(qr_data):
                    return {
                        "type_number": 1,
                        "qr_data": qr_data,
                        "message": "QR 코드 인식 성공 (URL 포함)",
                    }
                else:
                    return {
                        "type_number": 2,
                        "qr_data": qr_data,
                        "message": "QR 코드 인식 성공 (URL 미포함)",
                    }
        except Exception as e:
            logger.warning(f"pyzbar 디코딩 실패: {e}")

        img_gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        qr_detector = cv2.QRCodeDetector()
        qr_data, points, straight_qrcode = qr_detector.detectAndDecode(img_gray)

        if qr_data and qr_data != "":
            logger.info(f"OpenCV 기본으로 QR 디코딩 성공: {qr_data[:50]}...")

            if is_url(qr_data):
                return {
                    "type_number": 1,
                    "qr_data": qr_data,
                    "message": "QR 코드 인식 성공 (URL 포함)",
                }
            else:
                return {
                    "type_number": 2,
                    "qr_data": qr_data,
                    "message": "QR 코드 인식 성공 (URL 미포함)",
                }

        preprocessing_methods = [
            (
                "적응형 이진화",
                lambda img: cv2.adaptiveThreshold(
                    img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
                ),
            ),
            ("대비 향상", lambda img: cv2.equalizeHist(img)),
            (
                "가우시안 블러 + 이진화",
                lambda img: cv2.threshold(
                    cv2.GaussianBlur(img, (5, 5), 0),
                    0,
                    255,
                    cv2.THRESH_BINARY + cv2.THRESH_OTSU,
                )[1],
            ),
            (
                "리사이즈 (2배)",
                lambda img: cv2.resize(
                    img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC
                ),
            ),
        ]

        for method_name, preprocess_func in preprocessing_methods:
            try:
                processed_img = preprocess_func(img_gray.copy())
                qr_data, points, straight_qrcode = qr_detector.detectAndDecode(
                    processed_img
                )

                if qr_data and qr_data != "":
                    logger.info(
                        f"OpenCV ({method_name})로 QR 디코딩 성공: {qr_data[:50]}..."
                    )

                    if is_url(qr_data):
                        return {
                            "type_number": 1,
                            "qr_data": qr_data,
                            "message": "QR 코드 인식 성공 (URL 포함)",
                        }
                    else:
                        return {
                            "type_number": 2,
                            "qr_data": qr_data,
                            "message": "QR 코드 인식 성공 (URL 미포함)",
                        }
            except Exception as e:
                logger.debug(f"{method_name} 전처리 실패: {e}")
                continue

        logger.warning("모든 디코딩 방법 실패")
        return {
            "type_number": -1,
            "qr_data": None,
            "message": "QR 코드를 인식할 수 없습니다",
        }

    except Exception as e:
        logger.error(f"QR 코드 디코딩 오류: {e}")
        return {
            "type_number": -1,
            "qr_data": None,
            "message": f"QR 코드 디코딩 오류: {str(e)}",
        }
