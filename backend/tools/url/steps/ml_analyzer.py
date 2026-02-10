import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging
from tools.url.steps.feature_extractors.type1_features import extract_type1_features
from tools.url.steps.feature_extractors.type2_features import extract_type2_features
from tools.url.config import PENALTY_AI_HIGH_RISK, PENALTY_AI_MEDIUM_RISK

logger = setup_colored_logging(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "LINK")
TYPE1_MODEL_PATH = os.path.join(MODEL_DIR, "type1_rf_model.pkl")
TYPE2_MODEL_PATH = os.path.join(MODEL_DIR, "type2_rf_model.pkl")
LABEL_ENCODERS_PATH = os.path.join(MODEL_DIR, "label_encoders.pkl")

_type1_model = None
_type2_model = None
_label_encoders = None


def load_models():
    global _type1_model, _type2_model, _label_encoders

    if _type1_model is None:
        try:
            logger.info("ML 모델 로드 중...")
            _type1_model = joblib.load(TYPE1_MODEL_PATH)
            _type2_model = joblib.load(TYPE2_MODEL_PATH)
            _label_encoders = joblib.load(LABEL_ENCODERS_PATH)
            logger.info("ML 모델 로드 완료")
        except Exception as e:
            logger.error(f"ML 모델 로드 실패: {e}")
            raise

    return _type1_model, _type2_model, _label_encoders


def preprocess_type1_features(features: Dict, label_encoders: Dict) -> pd.DataFrame:
    df = pd.DataFrame([features])

    categorical_columns = ["CHARSET", "SERVER", "WHOIS_COUNTRY", "WHOIS_STATEPRO"]
    for col in categorical_columns:
        df[col] = df[col].astype(str)
        try:
            df[col] = label_encoders[col].transform(df[col])
        except:
            logger.warning(f"{col} 값이 데이터에 없음. 기본값 사용.")
            df[col] = 0

    numeric_columns = [
        "URL_LENGTH",
        "NUMBER_SPECIAL_CHARACTERS",
        "CONTENT_LENGTH",
        "WHOIS_DATE_DIFF",
        "DNS_QUERY_TIMES",
    ]
    for col in numeric_columns:
        df.loc[df[col] == -1, col] = np.nan
        df[col] = df[col].fillna(0)

    return df


def preprocess_type2_features(features: Dict) -> pd.DataFrame:
    return pd.DataFrame([features])


async def analyze_with_ml_models(url: str, final_url: str = None) -> Dict[str, Any]:
    logger.info("단계 1.5: ML 모델 분석 시작")

    try:
        type1_model, type2_model, label_encoders = load_models()

        logger.info("Type1 피처 추출 중...")
        type1_features = extract_type1_features(url, final_url=final_url)
        type1_df = preprocess_type1_features(type1_features, label_encoders)
        type1_pred = type1_model.predict(type1_df)[0]
        type1_proba = type1_model.predict_proba(type1_df)[0]

        logger.info(
            f"Type1 예측: {'피싱' if type1_pred == 1 else '정상'} (피싱 확률: {type1_proba[1]:.2%})"
        )

        logger.info("Type2 피처 추출 중...")
        type2_features = extract_type2_features(url, final_url=final_url)
        type2_df = preprocess_type2_features(type2_features)
        type2_pred = type2_model.predict(type2_df)[0]
        type2_proba = type2_model.predict_proba(type2_df)[0]

        logger.info(
            f"Type2 예측: {'피싱' if type2_pred == 1 else '정상'} (피싱 확률: {type2_proba[1]:.2%})"
        )

        weight1 = 0.98
        weight2 = 0.92
        ensemble_proba = (type1_proba[1] * weight1 + type2_proba[1] * weight2) / (
            weight1 + weight2
        )
        ensemble_pred = 1 if ensemble_proba > 0.5 else 0

        logger.info(
            f"앙상블 결과: {'피싱' if ensemble_pred == 1 else '정상'} (피싱 확률: {ensemble_proba:.2%})"
        )

        penalty = 0
        status = "SAFE"

        if ensemble_proba >= 0.7:
            penalty = PENALTY_AI_HIGH_RISK
            status = "DANGER"
        elif ensemble_proba >= 0.4:
            penalty = PENALTY_AI_MEDIUM_RISK
            status = "SUSPICIOUS"

        return {
            "step": 1.5,
            "name": "ML 모델 분석",
            "type1_prediction": int(type1_pred),
            "type1_probability": float(type1_proba[1]),
            "type2_prediction": int(type2_pred),
            "type2_probability": float(type2_proba[1]),
            "ensemble_prediction": int(ensemble_pred),
            "ensemble_probability": float(ensemble_proba),
            "penalty": penalty,
            "status": status,
            "message": f"ML 앙상블 피싱 확률: {ensemble_proba:.1%}",
        }

    except Exception as e:
        logger.error(f"ML 모델 분석 오류: {e}")
        import traceback

        traceback.print_exc()
        return {
            "step": 1.5,
            "name": "ML 모델 분석",
            "error": str(e),
            "penalty": 0,
            "status": "ERROR",
        }
