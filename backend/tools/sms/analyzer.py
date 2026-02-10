import os
import torch
import torch.nn as nn
from transformers import BertModel, RobertaModel, AutoTokenizer
from concurrent.futures import ThreadPoolExecutor
import re
import json
from openai import OpenAI
from typing import Dict, Any, List, Optional
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from utils.logging_config import setup_colored_logging
from tools.url.analyzer import analyze_url

logger = setup_colored_logging(__name__)

_openai_client = None


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


MODEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "SMS"
)
KO_MODEL_PATH = os.path.join(MODEL_DIR, "ko.pt")
EN_MODEL_PATH = os.path.join(MODEL_DIR, "en.pt")


class KoBERTPlain(nn.Module):
    def __init__(self):
        super(KoBERTPlain, self).__init__()
        self.kobert = BertModel.from_pretrained("skt/kobert-base-v1")
        self.classifier = nn.Linear(768, 2)

    def forward(self, input_ids, attention_mask, token_type_ids=None):
        outputs = self.kobert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
        )
        pooler_output = outputs.pooler_output
        logits = self.classifier(pooler_output)
        return logits


class RoBERTaPlain(nn.Module):
    def __init__(self):
        super(RoBERTaPlain, self).__init__()
        self.roberta = RobertaModel.from_pretrained("roberta-large")
        self.classifier = nn.Linear(1024, 2)

    def forward(self, input_ids, attention_mask):
        outputs = self.roberta(input_ids=input_ids, attention_mask=attention_mask)
        pooler_output = outputs.pooler_output
        logits = self.classifier(pooler_output)
        return logits


_ko_model = None
_en_model = None
_ko_tokenizer = None
_en_tokenizer = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def get_ko_model():
    global _ko_model, _ko_tokenizer
    if _ko_model is None:
        logger.info("Loading KoBERT model...")
        try:
            model = KoBERTPlain()
            checkpoint = torch.load(KO_MODEL_PATH, map_location=_device)
            model.load_state_dict(checkpoint["model_state_dict"])
            model.to(_device)
            model.eval()
            tokenizer = AutoTokenizer.from_pretrained("skt/kobert-base-v1")

            _ko_model = model
            _ko_tokenizer = tokenizer
            logger.info("KoBERT model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load KoBERT model: {e}")
            raise e
    return _ko_model, _ko_tokenizer


def get_en_model():
    global _en_model, _en_tokenizer
    if _en_model is None:
        logger.info("Loading RoBERTa model...")
        try:
            model = RoBERTaPlain()
            checkpoint = torch.load(EN_MODEL_PATH, map_location=_device)
            model.load_state_dict(checkpoint["model_state_dict"])
            model.to(_device)
            model.eval()
            tokenizer = AutoTokenizer.from_pretrained("roberta-large")

            _en_model = model
            _en_tokenizer = tokenizer
            logger.info("RoBERTa model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load RoBERTa model: {e}")
            raise e
    return _en_model, _en_tokenizer


def detect_language(text: str) -> str:
    if re.search("[가-힣]", text):
        return "ko"
    return "en"


def extract_urls(text: str) -> List[str]:
    url_pattern = re.compile(
        r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+"
    )
    return url_pattern.findall(text)


async def analyze_sms(text: str) -> Dict[str, Any]:
    logger.info(f"Analyzing SMS: {text}")

    current_trust_score = 100
    results = {"text": text, "steps": {}, "base_trust_score": 100}

    lang = detect_language(text)
    results["language"] = lang

    phishing_prob = 0.0
    step1_penalty = 0

    try:
        if lang == "ko":
            model, tokenizer = get_ko_model()
        else:
            model, tokenizer = get_en_model()

        inputs = tokenizer(
            text, return_tensors="pt", truncation=True, padding=True, max_length=128
        ).to(_device)

        with torch.no_grad():
            if lang == "ko":
                logits = model(
                    inputs["input_ids"],
                    inputs["attention_mask"],
                    inputs.get("token_type_ids"),
                )
            else:
                logits = model(inputs["input_ids"], inputs["attention_mask"])

            probs = torch.softmax(logits, dim=1)
            phishing_prob = probs[0][0].item()

        logger.info(f"Model ({lang}) phishing probability: {phishing_prob:.4f}")

        if phishing_prob > 0.5:
            step1_penalty = int(phishing_prob * 100)

        results["steps"]["step1"] = {
            "name": "Model Analysis",
            "model": f"{lang}_model",
            "phishing_probability": phishing_prob,
            "penalty": step1_penalty,
        }
        current_trust_score -= step1_penalty

    except Exception as e:
        logger.error(f"Error in Step 1 (Model): {e}")
        results["steps"]["step1"] = {"error": str(e), "penalty": 0}

    ai_confidence = 0.0

    try:
        if step1_penalty > 0:
            client = get_openai_client()

            prompt = f"""다음 SMS 메시지가 피싱일 가능성을 분석해주세요.
            
            메시지 내용:
            "{text}"
            
            1단계 AI 모델 분석 결과:
            - 언어: {lang}
            - 피싱 확률: {phishing_prob:.4f}
            
            위 모델 분석 결과가 맞는지 검증해주세요. 
            특히 1단계 모델이 피싱이라고 판단했을 때, 그것이 정말 피싱인지 0.0 ~ 1.0 사이의 신뢰도로 평가해주세요.
            만약 피싱이 확실하다면 신뢰도 1.0, 피싱이 아니라면(오탐이라면) 신뢰도 0.0을 부여하세요.
            
            다음 JSON 형식으로 답변해주세요:
            {{
                "is_phishing": true/false,
                "confidence": 0.0 ~ 1.0,
                "reason": "판단 근거"
            }}
            """

            response = client.chat.completions.create(
                model="o4-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 SMS 보안 전문가입니다. 피싱 메시지 여부를 정확히 판단하고 이전 단계 모델의 결과를 검증합니다.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )

            ai_result_text = response.choices[0].message.content
            ai_result = json.loads(ai_result_text)

            ai_confidence = float(ai_result.get("confidence", 0.0))
            is_verified_phishing = ai_result.get("is_phishing", False)

            final_step1_penalty = int(step1_penalty * ai_confidence)

            results["steps"]["step2"] = {
                "name": "AI Verification",
                "ai_confidence": ai_confidence,
                "original_penalty": step1_penalty,
                "adjusted_penalty": final_step1_penalty,
                "reason": ai_result.get("reason", ""),
                "is_phishing": is_verified_phishing,
                "penalty": 0,
            }

            restitution = step1_penalty - final_step1_penalty
            current_trust_score += restitution
            logger.info(
                f"Step 2 AI Verification: Confidence {ai_confidence}, Restitution +{restitution}"
            )

        else:
            results["steps"]["step2"] = {
                "name": "AI Verification",
                "status": "Skipped (Step 1 penalty is 0)",
            }

    except Exception as e:
        logger.error(f"Error in Step 2 (AI): {e}")
        results["steps"]["step2"] = {"error": str(e)}

    urls = extract_urls(text)
    step3_penalty = 0
    url_results = []

    if urls:
        logger.info(f"Found URLs: {urls}")
        for url in urls:
            url_res = await analyze_url(url)
            url_results.append(url_res)

            if url_res.get("final_status") == "DANGER":
                step3_penalty += 50
            elif url_res.get("final_status") == "SUSPICIOUS":
                step3_penalty += 20

    results["steps"]["step3"] = {
        "urls_found": urls,
        "url_analysis_results": url_results,
        "penalty": step3_penalty,
    }

    if url_results:
        last_result = url_results[-1]
        if "screenshot_url" in last_result:
            results["screenshot_url"] = last_result["screenshot_url"]

    current_trust_score -= step3_penalty

    results["final_trust_score"] = max(0, min(100, current_trust_score))

    if current_trust_score >= 70:
        results["final_status"] = "SAFE"
        results["message"] = (
            f"최종 신뢰도: {results['final_trust_score']}점 - 안전한 메시지로 판단됩니다"
        )
    elif current_trust_score >= 40:
        results["final_status"] = "SUSPICIOUS"
        results["message"] = (
            f"최종 신뢰도: {results['final_trust_score']}점 - 의심스러운 메시지입니다. 주의하세요"
        )
    else:
        results["final_status"] = "DANGER"
        results["message"] = (
            f"최종 신뢰도: {results['final_trust_score']}점 - 피싱 메시지입니다! 링크를 클릭하지 마세요"
        )

    if "step2" in results["steps"] and "reason" in results["steps"]["step2"]:
        step2 = results["steps"]["step2"]

        if step2.get("is_phishing", False) and step2.get("ai_confidence", 0) > 0.7:
            risk_level = "high"
        elif step2.get("is_phishing", False) and step2.get("ai_confidence", 0) > 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"

        results["steps"]["ai_analysis"] = {
            "risk_level": risk_level,
            "confidence": int(step2.get("ai_confidence", 0) * 100),
            "reason": step2.get("reason", "AI 분석 결과를 가져올 수 없습니다"),
        }

    risk_factors = []
    if step1_penalty > 0:
        risk_factors.append(f"ML 모델이 피싱 확률 {phishing_prob:.1%}로 탐지")
    if step3_penalty > 0:
        risk_factors.append(f"의심스러운 URL 발견 (감점: {step3_penalty}점)")
    if urls:
        risk_factors.append(f"URL 포함: {len(urls)}개")

    results["risk_factors"] = risk_factors

    try:
        from utils.summary_generator import generate_summary_async

        summary = await generate_summary_async(results, "sms")
        results["easy_summary"] = summary.get("easy_summary")
        results["expert_summary"] = summary.get("expert_summary")
        logger.info("SMS 분석 결과 요약 생성 완료")
    except Exception as e:
        logger.error(f"요약 생성 중 오류: {e}")

    logger.info(
        f"SMS Analysis Complete - Trust Score: {results['final_trust_score']}, Status: {results['final_status']}"
    )

    return results
