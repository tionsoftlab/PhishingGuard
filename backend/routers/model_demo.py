import os
import io
import csv
import json
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import re
from typing import Dict, Any
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
from transformers import BertModel, RobertaModel, AutoTokenizer

import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.logging_config import setup_colored_logging

logger = setup_colored_logging(__name__)

router = APIRouter(prefix="/demo", tags=["Model Demo"])

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")

URL_TYPE1_MODEL = os.path.join(BASE_DIR, "models", "LINK", "type1_rf_model.pkl")
URL_TYPE2_MODEL = os.path.join(BASE_DIR, "models", "LINK", "type2_rf_model.pkl")
LABEL_ENCODERS = os.path.join(BASE_DIR, "models", "LINK", "label_encoders.pkl")

SMS_KO_MODEL = os.path.join(BASE_DIR, "models", "SMS", "ko.pt")
SMS_EN_MODEL = os.path.join(BASE_DIR, "models", "SMS", "en.pt")

DATASET_TYPE1 = os.path.join(MODELS_DIR, "LINK", "type1", "dataset_type1.csv")
DATASET_TYPE2 = os.path.join(MODELS_DIR, "LINK", "type2", "dataset_type2.csv")
DATASET_SMS_KO = os.path.join(MODELS_DIR, "SMS", "ko", "dataset.csv")
DATASET_SMS_EN = os.path.join(MODELS_DIR, "SMS", "en", "dataset.csv")

RESULTS_TYPE1 = os.path.join(MODELS_DIR, "LINK", "type1", "type1_rf_results.json")
RESULTS_TYPE2 = os.path.join(MODELS_DIR, "LINK", "type2", "type2_rf_results.json")


class KoBERTPlain(nn.Module):
    def __init__(self):
        super().__init__()
        self.kobert = BertModel.from_pretrained("skt/kobert-base-v1")
        self.classifier = nn.Linear(768, 2)

    def forward(self, input_ids, attention_mask, token_type_ids=None):
        outputs = self.kobert(input_ids=input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids)
        return self.classifier(outputs.pooler_output)


class RoBERTaPlain(nn.Module):
    def __init__(self):
        super().__init__()
        self.roberta = RobertaModel.from_pretrained("roberta-large")
        self.classifier = nn.Linear(1024, 2)

    def forward(self, input_ids, attention_mask):
        outputs = self.roberta(input_ids=input_ids, attention_mask=attention_mask)
        return self.classifier(outputs.pooler_output)


_cache: Dict[str, Any] = {}
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _load_url_models():
    if "url" not in _cache:
        _cache["url"] = {
            "type1": joblib.load(URL_TYPE1_MODEL),
            "type2": joblib.load(URL_TYPE2_MODEL),
            "le": joblib.load(LABEL_ENCODERS),
        }
    return _cache["url"]


def _load_sms_ko():
    if "sms_ko" not in _cache:
        model = KoBERTPlain()
        ckpt = torch.load(SMS_KO_MODEL, map_location=_device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.to(_device).eval()
        tok = AutoTokenizer.from_pretrained("skt/kobert-base-v1")
        _cache["sms_ko"] = (model, tok)
    return _cache["sms_ko"]


def _load_sms_en():
    if "sms_en" not in _cache:
        model = RoBERTaPlain()
        ckpt = torch.load(SMS_EN_MODEL, map_location=_device)
        model.load_state_dict(ckpt["model_state_dict"])
        model.to(_device).eval()
        tok = AutoTokenizer.from_pretrained("roberta-large")
        _cache["sms_en"] = (model, tok)
    return _cache["sms_en"]


class SMSRequest(BaseModel):
    text: str
    lang: str = "auto"


class URLFeaturesRequest(BaseModel):
    url: str


@router.post("/api/sms/predict")
async def sms_predict(req: SMSRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "텍스트를 입력하세요.")

    lang = req.lang
    if lang == "auto":
        lang = "ko" if re.search("[가-힣]", text) else "en"

    try:
        if lang == "ko":
            model, tokenizer = _load_sms_ko()
        else:
            model, tokenizer = _load_sms_en()

        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(_device)

        with torch.no_grad():
            if lang == "ko":
                logits = model(inputs["input_ids"], inputs["attention_mask"], inputs.get("token_type_ids"))
            else:
                logits = model(inputs["input_ids"], inputs["attention_mask"])
            probs = torch.softmax(logits, dim=1)

        phishing_prob = probs[0][0].item()
        normal_prob = probs[0][1].item()

        return {
            "language": lang,
            "model": "KoBERT (skt/kobert-base-v1)" if lang == "ko" else "RoBERTa-Large",
            "label": "피싱" if phishing_prob > 0.5 else "정상",
            "phishing_probability": round(phishing_prob * 100, 2),
            "normal_probability": round(normal_prob * 100, 2),
        }
    except Exception as e:
        logger.error(f"SMS 예측 오류: {e}")
        raise HTTPException(500, f"예측 실패: {str(e)}")


@router.post("/api/url/predict")
async def url_predict(req: URLFeaturesRequest):
    from tools.url.steps.feature_extractors.type1_features import extract_type1_features
    from tools.url.steps.feature_extractors.type2_features import extract_type2_features

    url = req.url.strip()
    if not url:
        raise HTTPException(400, "URL을 입력하세요.")
    if not url.startswith("http"):
        url = "https://" + url

    try:
        models = _load_url_models()

        t1_features = extract_type1_features(url)
        t1_df = pd.DataFrame([t1_features])
        cat_cols = ["CHARSET", "SERVER", "WHOIS_COUNTRY", "WHOIS_STATEPRO"]
        for c in cat_cols:
            t1_df[c] = t1_df[c].astype(str)
            try:
                t1_df[c] = models["le"][c].transform(t1_df[c])
            except:
                t1_df[c] = 0
        num_cols = ["URL_LENGTH", "NUMBER_SPECIAL_CHARACTERS", "CONTENT_LENGTH", "WHOIS_DATE_DIFF", "DNS_QUERY_TIMES"]
        for c in num_cols:
            t1_df.loc[t1_df[c] == -1, c] = np.nan
            t1_df[c] = t1_df[c].fillna(0)

        t1_pred = models["type1"].predict(t1_df)[0]
        t1_proba = models["type1"].predict_proba(t1_df)[0]

        t2_features = extract_type2_features(url)
        t2_df = pd.DataFrame([t2_features])
        if "Index" in t2_df.columns:
            t2_df.drop("Index", axis=1, inplace=True)

        t2_pred = models["type2"].predict(t2_df)[0]
        t2_proba = models["type2"].predict_proba(t2_df)[0]

        w1, w2 = 0.98, 0.92
        ens_prob = (t1_proba[1] * w1 + t2_proba[1] * w2) / (w1 + w2)

        return {
            "url": url,
            "type1": {
                "model": "Random Forest (Type 1)",
                "prediction": "피싱" if t1_pred == 1 else "정상",
                "phishing_probability": round(float(t1_proba[1]) * 100, 2),
                "normal_probability": round(float(t1_proba[0]) * 100, 2),
                "features_used": list(t1_features.keys()),
            },
            "type2": {
                "model": "Random Forest (Type 2)",
                "prediction": "피싱" if t2_pred == 1 else "정상",
                "phishing_probability": round(float(t2_proba[1]) * 100, 2),
                "normal_probability": round(float(t2_proba[0]) * 100, 2),
                "features_used": list(t2_features.keys()),
            },
            "ensemble": {
                "prediction": "피싱" if ens_prob > 0.5 else "정상",
                "phishing_probability": round(float(ens_prob) * 100, 2),
                "weight": {"type1": w1, "type2": w2},
            },
        }
    except Exception as e:
        logger.error(f"URL 예측 오류: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(500, f"예측 실패: {str(e)}")


DATASET_MAP = {
    "url_type1": DATASET_TYPE1,
    "url_type2": DATASET_TYPE2,
    "sms_ko": DATASET_SMS_KO,
    "sms_en": DATASET_SMS_EN,
}

DATASET_NAMES = {
    "url_type1": "URL_Type1_Dataset.csv",
    "url_type2": "URL_Type2_Dataset.csv",
    "sms_ko": "SMS_Korean_Dataset.csv",
    "sms_en": "SMS_English_Dataset.csv",
}


@router.get("/api/dataset/preview")
async def dataset_preview(name: str = Query(...), rows: int = Query(20, ge=1, le=200)):
    path = DATASET_MAP.get(name)
    if not path or not os.path.exists(path):
        raise HTTPException(404, "데이터셋을 찾을 수 없습니다.")
    df = pd.read_csv(path, nrows=rows)
    total = sum(1 for _ in open(path)) - 1
    return {
        "name": name,
        "total_rows": total,
        "preview_rows": len(df),
        "columns": list(df.columns),
        "data": df.fillna("").to_dict(orient="records"),
    }


@router.get("/api/dataset/download")
async def dataset_download(name: str = Query(...)):
    path = DATASET_MAP.get(name)
    if not path or not os.path.exists(path):
        raise HTTPException(404, "데이터셋을 찾을 수 없습니다.")
    filename = DATASET_NAMES.get(name, f"{name}.csv")

    def iterfile():
        with open(path, "rb") as f:
            while chunk := f.read(64 * 1024):
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/model/results")
async def model_results():
    out = {}
    for key, path in [("type1", RESULTS_TYPE1), ("type2", RESULTS_TYPE2)]:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                out[key] = json.load(f)
    return out


@router.get("/", response_class=HTMLResponse)
async def demo_page():
    return HTMLResponse(content=_HTML_PAGE)


_HTML_PAGE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ML 모델 데모 | 피싱가드</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a26;--border:#262636;--text:#e4e4ed;--text2:#9494a8;--blue:#3b82f6;--blue2:#2563eb;--green:#22c55e;--red:#ef4444;--orange:#f59e0b;--purple:#a855f7;--radius:12px}
body{background:var(--bg);color:var(--text);font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;min-height:100vh}
a{color:var(--blue);text-decoration:none}
.container{max-width:1200px;margin:0 auto;padding:24px 20px 60px}
header{text-align:center;padding:48px 0 32px}
header h1{font-size:2rem;font-weight:800;background:linear-gradient(135deg,var(--blue),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
header p{color:var(--text2);font-size:0.95rem}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;letter-spacing:0.3px}
.badge-blue{background:rgba(59,130,246,.15);color:var(--blue)}
.badge-green{background:rgba(34,197,94,.15);color:var(--green)}
.badge-red{background:rgba(239,68,68,.15);color:var(--red)}
.badge-purple{background:rgba(168,85,247,.15);color:var(--purple)}
.badge-orange{background:rgba(245,158,11,.15);color:var(--orange)}

/* tabs */
.tabs{display:flex;gap:6px;margin-bottom:28px;border-bottom:1px solid var(--border);padding-bottom:0;overflow-x:auto}
.tab{padding:12px 22px;cursor:pointer;font-size:0.88rem;font-weight:600;color:var(--text2);border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;user-select:none}
.tab:hover{color:var(--text)}
.tab.active{color:var(--blue);border-bottom-color:var(--blue)}

/* cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;margin-bottom:20px}
.card h2{font-size:1.15rem;font-weight:700;margin-bottom:6px}
.card h3{font-size:0.95rem;font-weight:600;margin-bottom:12px;color:var(--text2)}
.card-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:768px){.card-grid{grid-template-columns:1fr}}

/* model info */
.model-info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.model-info .item{background:var(--surface2);padding:14px 16px;border-radius:8px}
.model-info .item .label{font-size:0.75rem;color:var(--text2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.model-info .item .value{font-size:0.95rem;font-weight:600}
@media(max-width:768px){.model-info{grid-template-columns:1fr}}

/* form */
.input-group{margin:16px 0}
.input-group label{display:block;font-size:0.82rem;font-weight:600;color:var(--text2);margin-bottom:6px}
input[type=text],textarea,select{width:100%;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.9rem;outline:none;transition:border .2s;font-family:inherit}
input[type=text]:focus,textarea:focus{border-color:var(--blue)}
textarea{resize:vertical;min-height:80px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:8px;font-size:0.88rem;font-weight:600;border:none;cursor:pointer;transition:all .15s}
.btn-primary{background:var(--blue);color:#fff}
.btn-primary:hover{background:var(--blue2)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text2)}
.btn-outline:hover{background:var(--surface2);color:var(--text)}
.btn-sm{padding:7px 14px;font-size:0.8rem}
.btn-group{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}

/* result */
.result-box{margin-top:20px;padding:20px;border-radius:10px;display:none}
.result-box.show{display:block}
.result-box.safe{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25)}
.result-box.danger{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25)}
.result-label{font-size:1.3rem;font-weight:800;margin-bottom:10px}
.result-label.safe{color:var(--green)}
.result-label.danger{color:var(--red)}
.prob-bar{height:8px;border-radius:4px;background:var(--surface2);margin:6px 0;overflow:hidden}
.prob-bar .fill{height:100%;border-radius:4px;transition:width .5s ease}
.prob-bar .fill.danger{background:var(--red)}
.prob-bar .fill.safe{background:var(--green)}
.prob-row{display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text2);margin-bottom:2px}
.detail-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:16px}
.detail-grid .item{text-align:center;padding:12px;background:var(--surface);border-radius:8px}
.detail-grid .item .num{font-size:1.2rem;font-weight:700}
.detail-grid .item .lbl{font-size:0.72rem;color:var(--text2);margin-top:2px}
@media(max-width:640px){.detail-grid{grid-template-columns:1fr 1fr}}

/* table */
.table-wrap{overflow-x:auto;margin-top:16px;border-radius:8px;border:1px solid var(--border)}
table{width:100%;border-collapse:collapse;font-size:0.82rem}
th{background:var(--surface2);padding:10px 14px;text-align:left;font-weight:600;color:var(--text2);white-space:nowrap;position:sticky;top:0}
td{padding:9px 14px;border-top:1px solid var(--border);white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis}
tr:hover td{background:rgba(59,130,246,.04)}

/* section toggle */
.section-panel{display:none}.section-panel.active{display:block}

/* spinner */
.spinner{display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* confusion matrix */
.cm{display:grid;grid-template-columns:auto 1fr 1fr;gap:0;font-size:.82rem;margin:12px 0}
.cm .corner{background:transparent}
.cm .head{background:var(--surface2);padding:8px 14px;text-align:center;font-weight:600}
.cm .cell{padding:10px 14px;text-align:center;font-weight:600;border:1px solid var(--border)}
.cm .label{padding:8px 14px;font-weight:600;background:var(--surface2);display:flex;align-items:center}

.desc-text{font-size:0.88rem;color:var(--text2);line-height:1.7;margin:10px 0}
.desc-text strong{color:var(--text)}
.feature-list{list-style:none;padding:0;margin:10px 0;display:flex;flex-wrap:wrap;gap:6px}
.feature-list li{background:var(--surface2);padding:5px 12px;border-radius:6px;font-size:0.78rem;color:var(--text2);font-family:'Fira Code',monospace}

.loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;display:none}
.loading-overlay.show{display:flex}
.loading-box{background:var(--surface);padding:32px 48px;border-radius:var(--radius);text-align:center}
.loading-box p{margin-top:12px;color:var(--text2);font-size:.9rem}
</style>
</head>
<body>
<div class="container">

<header>
  <h1>🛡️ 피싱가드 ML 모델 데모</h1>
  <p>URL 피싱 탐지 모델 2종 &amp; SMS 피싱 탐지 모델 2종을 직접 테스트해보세요</p>
</header>

<!-- Tabs -->
<div class="tabs" role="tablist">
  <div class="tab active" onclick="switchTab('sms')" data-tab="sms">💬 SMS 모델</div>
  <div class="tab" onclick="switchTab('url')" data-tab="url">🔗 URL 모델</div>
  <div class="tab" onclick="switchTab('dataset')" data-tab="dataset">📊 데이터셋</div>
  <div class="tab" onclick="switchTab('about')" data-tab="about">📖 모델 설명</div>
</div>

<!-- ═══════════════════ SMS TAB ═══════════════════ -->
<div class="section-panel active" id="panel-sms">
  <div class="card-grid">
    <div class="card">
      <h2>SMS 피싱 탐지 데모</h2>
      <h3>한국어 (KoBERT) · 영어 (RoBERTa-Large)</h3>
      <div class="input-group">
        <label>분석할 문자 메시지</label>
        <textarea id="sms-input" placeholder="분석할 SMS 메시지를 입력하세요...&#10;예) [Web발신] 고객님 계정이 해외에서 로그인되었습니다. 본인이 아닌 경우 즉시 확인하세요 http://example.com"></textarea>
      </div>
      <div class="input-group">
        <label>언어 선택</label>
        <select id="sms-lang">
          <option value="auto">자동 감지</option>
          <option value="ko">한국어 (KoBERT)</option>
          <option value="en">English (RoBERTa)</option>
        </select>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="predictSMS()" id="sms-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          분석하기
        </button>
        <button class="btn btn-outline btn-sm" onclick="fillSample('ko')">한국어 샘플</button>
        <button class="btn btn-outline btn-sm" onclick="fillSample('en')">영어 샘플</button>
      </div>
      <div class="result-box" id="sms-result"></div>
    </div>

    <div class="card">
      <h2>모델 정보</h2>
      <div style="margin-top:8px">
        <h3 style="color:var(--blue)">🇰🇷 한국어 — KoBERT</h3>
        <div class="model-info">
          <div class="item"><div class="label">Base Model</div><div class="value">skt/kobert-base-v1</div></div>
          <div class="item"><div class="label">학습 데이터</div><div class="value">40,736 건</div></div>
          <div class="item"><div class="label">Max Length</div><div class="value">128 tokens</div></div>
          <div class="item"><div class="label">Dropout</div><div class="value">0.3</div></div>
        </div>
      </div>
      <div style="margin-top:20px">
        <h3 style="color:var(--purple)">🇺🇸 영어 — RoBERTa-Large</h3>
        <div class="model-info">
          <div class="item"><div class="label">Base Model</div><div class="value">roberta-large</div></div>
          <div class="item"><div class="label">학습 데이터</div><div class="value">5,572 건</div></div>
          <div class="item"><div class="label">Max Length</div><div class="value">256 tokens</div></div>
          <div class="item"><div class="label">Dropout</div><div class="value">0.3</div></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════ URL TAB ═══════════════════ -->
<div class="section-panel" id="panel-url">
  <div class="card-grid">
    <div class="card">
      <h2>URL 피싱 탐지 데모</h2>
      <h3>Type1 + Type2 앙상블</h3>
      <div class="input-group">
        <label>분석할 URL</label>
        <input type="text" id="url-input" placeholder="https://example.com">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="predictURL()" id="url-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          분석하기
        </button>
      </div>
      <p style="font-size:.78rem;color:var(--text2);margin-top:10px">⏱ URL 분석은 피처 추출 과정으로 10~30초 소요될 수 있습니다.</p>
      <div class="result-box" id="url-result"></div>
    </div>

    <div class="card">
      <h2>모델 정보</h2>
      <div style="margin-top:8px">
        <h3 style="color:var(--green)">Type 1 <span class="badge badge-green">정확도 98.04%</span></h3>
        <div class="model-info">
          <div class="item"><div class="label">알고리즘</div><div class="value">Random Forest</div></div>
          <div class="item"><div class="label">학습 데이터</div><div class="value">1,781 건</div></div>
          <div class="item"><div class="label">n_estimators</div><div class="value">100</div></div>
          <div class="item"><div class="label">max_depth</div><div class="value">15</div></div>
        </div>
        <p class="desc-text" style="font-size:.78rem">피처: URL_LENGTH, NUMBER_SPECIAL_CHARACTERS, CHARSET, SERVER, CONTENT_LENGTH, WHOIS_COUNTRY, WHOIS_STATEPRO, WHOIS_DATE_DIFF, DNS_QUERY_TIMES</p>
      </div>
      <div style="margin-top:20px">
        <h3 style="color:var(--orange)">Type 2 <span class="badge badge-orange">정확도 92.54%</span></h3>
        <div class="model-info">
          <div class="item"><div class="label">알고리즘</div><div class="value">Random Forest</div></div>
          <div class="item"><div class="label">학습 데이터</div><div class="value">11,054 건</div></div>
          <div class="item"><div class="label">n_estimators</div><div class="value">100</div></div>
          <div class="item"><div class="label">max_depth</div><div class="value">15</div></div>
        </div>
        <p class="desc-text" style="font-size:.78rem">피처: UsingIP, LongURL, ShortURL, Symbol@, Redirecting//, PrefixSuffix-, SubDomains, HTTPS, DomainRegLen, Favicon 등 19종</p>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════ DATASET TAB ═══════════════════ -->
<div class="section-panel" id="panel-dataset">
  <div class="card">
    <h2>📊 학습 데이터셋 열람 및 다운로드</h2>
    <p class="desc-text">각 모델 학습에 사용된 원본 데이터셋을 미리보기하고 다운로드할 수 있습니다.</p>

    <div class="btn-group" style="margin:20px 0 8px">
      <button class="btn btn-sm btn-outline ds-tab active" onclick="loadDataset('url_type1',this)">URL Type1</button>
      <button class="btn btn-sm btn-outline ds-tab" onclick="loadDataset('url_type2',this)">URL Type2</button>
      <button class="btn btn-sm btn-outline ds-tab" onclick="loadDataset('sms_ko',this)">SMS 한국어</button>
      <button class="btn btn-sm btn-outline ds-tab" onclick="loadDataset('sms_en',this)">SMS 영어</button>
    </div>

    <div id="ds-info" style="display:flex;align-items:center;gap:12px;margin:12px 0;flex-wrap:wrap">
      <span id="ds-total" class="badge badge-blue"></span>
      <span id="ds-cols" class="badge badge-purple"></span>
      <button class="btn btn-sm btn-primary" id="ds-download-btn" onclick="downloadDataset()" style="margin-left:auto">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        CSV 다운로드
      </button>
    </div>

    <div class="input-group" style="max-width:200px">
      <label>미리보기 행 수</label>
      <select id="ds-rows" onchange="reloadDataset()">
        <option value="20">20행</option>
        <option value="50">50행</option>
        <option value="100">100행</option>
        <option value="200">200행</option>
      </select>
    </div>

    <div class="table-wrap" id="ds-table" style="max-height:500px;overflow-y:auto">
      <p style="padding:20px;text-align:center;color:var(--text2)">데이터셋을 선택하세요.</p>
    </div>
  </div>
</div>

<!-- ═══════════════════ ABOUT TAB ═══════════════════ -->
<div class="section-panel" id="panel-about">

  <!-- SMS 모델 설명 -->
  <div class="card">
    <h2>💬 SMS 피싱 탐지 모델</h2>
    <p class="desc-text">SMS(문자 메시지)의 텍스트를 분석하여 피싱/스미싱 여부를 판별하는 <strong>자연어 처리(NLP)</strong> 기반 딥러닝 분류 모델입니다. 한국어와 영어를 각각 전담하는 2개의 모델로 구성되어 있으며, 입력 메시지의 언어를 자동 감지하여 적절한 모델을 선택합니다.</p>

    <div class="card-grid" style="margin-top:20px">
      <div class="card" style="border-color:var(--blue)">
        <h3>🇰🇷 한국어 모델 — KoBERT</h3>
        <div class="desc-text">
          <p><strong>기반 모델:</strong> skt/kobert-base-v1 (SKTBrain에서 개발한 한국어 특화 BERT)</p>
          <p><strong>아키텍처:</strong> KoBERT → Dropout(0.3) → Linear(768 → 2)</p>
          <p><strong>학습 데이터:</strong> 한국어 피싱/정상 SMS 40,736건 (피싱 메시지와 정상 메시지의 균형 학습)</p>
          <p><strong>입력 처리:</strong> 최대 128 토큰, Padding &amp; Truncation 적용</p>
          <p><strong>학습 설정:</strong> Batch Size 32, Learning Rate 2e-5, 5 Epochs</p>
          <p><strong>출력:</strong> [피싱 확률, 정상 확률] (Softmax)</p>
          <p style="margin-top:8px"><strong>특징:</strong> 한국어의 형태학적 특성(조사, 어미 변화 등)을 반영하는 한국어 WordPiece 토크나이저 사용. "택배 배송 확인", "계정 정지", "본인인증" 등 한국형 스미싱 패턴에 최적화.</p>
        </div>
      </div>
      <div class="card" style="border-color:var(--purple)">
        <h3>🇺🇸 영어 모델 — RoBERTa-Large</h3>
        <div class="desc-text">
          <p><strong>기반 모델:</strong> roberta-large (Facebook/Meta의 Robustly Optimized BERT)</p>
          <p><strong>아키텍처:</strong> RoBERTa-Large → Dropout(0.3) → Linear(1024 → 2)</p>
          <p><strong>학습 데이터:</strong> 영어 Spam/Ham SMS 5,572건 (UCI SMS Spam Collection 기반)</p>
          <p><strong>입력 처리:</strong> 최대 256 토큰, Padding &amp; Truncation 적용</p>
          <p><strong>학습 설정:</strong> Batch Size 16, Learning Rate 2e-5, 5 Epochs</p>
          <p><strong>출력:</strong> [Spam 확률, Normal 확률] (Softmax)</p>
          <p style="margin-top:8px"><strong>특징:</strong> BERT보다 더 많은 데이터와 Dynamic Masking으로 사전훈련된 RoBERTa-Large(355M 파라미터) 사용. "Free entry", "You've won", "Click here" 등 영어권 스팸/피싱 패턴 학습.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- URL 모델 설명 -->
  <div class="card">
    <h2>🔗 URL 피싱 탐지 모델</h2>
    <p class="desc-text">URL의 다양한 특징(Feature)을 추출하여 피싱 사이트 여부를 판별하는 <strong>랜덤 포레스트(Random Forest)</strong> 기반 앙상블 모델입니다. 서로 다른 특징 세트를 사용하는 2개의 모델을 가중 앙상블하여 최종 판정합니다.</p>

    <div class="card-grid" style="margin-top:20px">
      <div class="card" style="border-color:var(--green)">
        <h3>Type 1 <span class="badge badge-green">98.04%</span></h3>
        <div class="desc-text">
          <p><strong>알고리즘:</strong> Random Forest (n_estimators=100, max_depth=15)</p>
          <p><strong>학습 데이터:</strong> 1,781건의 URL 피싱/정상 데이터</p>
          <p><strong>앙상블 가중치:</strong> 0.98 (높은 정확도 반영)</p>
        </div>
        <p style="font-size:.82rem;font-weight:600;margin:12px 0 6px;color:var(--text)">추출 피처 (9종)</p>
        <ul class="feature-list">
          <li>URL_LENGTH</li><li>NUMBER_SPECIAL_CHARACTERS</li><li>CHARSET</li>
          <li>SERVER</li><li>CONTENT_LENGTH</li><li>WHOIS_COUNTRY</li>
          <li>WHOIS_STATEPRO</li><li>WHOIS_DATE_DIFF</li><li>DNS_QUERY_TIMES</li>
        </ul>
        <div class="desc-text" style="font-size:.82rem">
          <p><strong>전처리:</strong> 범주형 변수는 Label Encoding, 수치형 변수의 결측값(-1)은 평균으로 대체.</p>
        </div>
      </div>
      <div class="card" style="border-color:var(--orange)">
        <h3>Type 2 <span class="badge badge-orange">92.54%</span></h3>
        <div class="desc-text">
          <p><strong>알고리즘:</strong> Random Forest (n_estimators=100, max_depth=15)</p>
          <p><strong>학습 데이터:</strong> 11,054건의 URL 피싱/정상 데이터</p>
          <p><strong>앙상블 가중치:</strong> 0.92</p>
        </div>
        <p style="font-size:.82rem;font-weight:600;margin:12px 0 6px;color:var(--text)">추출 피처 (19종)</p>
        <ul class="feature-list">
          <li>UsingIP</li><li>LongURL</li><li>ShortURL</li><li>Symbol@</li>
          <li>Redirecting//</li><li>PrefixSuffix-</li><li>SubDomains</li>
          <li>HTTPS</li><li>DomainRegLen</li><li>Favicon</li><li>NonStdPort</li>
          <li>HTTPSDomainURL</li><li>RequestURL</li><li>InfoEmail</li>
          <li>WebsiteForwarding</li><li>DisableRightClick</li><li>UsingPopupWindow</li>
          <li>IframeRedirection</li><li>AgeofDomain</li>
        </ul>
        <div class="desc-text" style="font-size:.82rem">
          <p><strong>전처리:</strong> 모든 피처가 수치형(-1, 0, 1)으로 인코딩. Index 컬럼 자동 제거.</p>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;border-color:var(--blue)">
      <h3>⚙️ 앙상블 전략</h3>
      <div class="desc-text">
        <p>두 모델의 피싱 확률을 <strong>가중 평균</strong>으로 결합합니다.</p>
        <p style="margin:8px 0;font-family:'Fira Code',monospace;color:var(--blue);font-size:.88rem">
          앙상블 확률 = (Type1_prob × 0.98 + Type2_prob × 0.92) / (0.98 + 0.92)
        </p>
        <p>Type1이 높은 정확도를 보이므로 더 높은 가중치(0.98)를 부여하고, Type2는 대규모 데이터로 학습되어 다양한 패턴을 커버하지만 상대적으로 낮은 가중치(0.92)를 적용합니다.</p>
        <p style="margin-top:8px"><strong>판정 기준:</strong> 앙상블 확률 ≥ 0.7 → 위험(DANGER), ≥ 0.4 → 의심(SUSPICIOUS), &lt; 0.4 → 안전(SAFE)</p>
      </div>
    </div>
  </div>

</div>

</div><!-- /container -->

<!-- Loading -->
<div class="loading-overlay" id="loading">
  <div class="loading-box">
    <div class="spinner"></div>
    <p id="loading-text">분석 중...</p>
  </div>
</div>

<script>
const API = window.location.origin + '/demo';

// ─── Tab switch ────────────────────────────────
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${id}"]`).classList.add('active');
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if(id === 'dataset' && !window._dsLoaded) { loadDataset('url_type1', document.querySelector('.ds-tab')); window._dsLoaded = true; }
}

// ─── SMS ───────────────────────────────────────
const SMS_SAMPLES = {
  ko: [
    "[Web발신] 고객님 계정이 해외IP에서 로그인되었습니다. 본인이 아닌 경우 즉시 확인 → http://fake-bank.com/verify",
    "엄마 나 폰이 고장나서 수리 맡겼어. 급한 일이 생겨서 100만원만 입금해 줄 수 있어?",
    "안녕하세요. 오늘 저녁 약속 시간은 7시로 변경되었습니다. 참고 부탁드립니다.",
    "[CJ대한통운] 미수령 택배가 있습니다. 확인: http://cj-delivery.xyz/check"
  ],
  en: [
    "URGENT! You have won a $1,000 Walmart gift card. Click here to claim: http://walmart-prizes.tk",
    "Free entry in 2 a wkly comp to win FA Cup final tkts. Text FA to 87121",
    "Hey, are we still on for lunch tomorrow? Let me know!",
    "Your Amazon account has been suspended. Verify now: http://amaz0n-verify.com"
  ]
};
let sampleIdx = { ko: 0, en: 0 };

function fillSample(lang) {
  const samples = SMS_SAMPLES[lang];
  document.getElementById('sms-input').value = samples[sampleIdx[lang] % samples.length];
  document.getElementById('sms-lang').value = lang;
  sampleIdx[lang]++;
}

async function predictSMS() {
  const text = document.getElementById('sms-input').value.trim();
  if(!text) return alert('메시지를 입력하세요.');
  const lang = document.getElementById('sms-lang').value;
  const btn = document.getElementById('sms-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 분석 중...';

  try {
    const res = await fetch(API + '/api/sms/predict', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ text, lang })
    });
    if(!res.ok) throw new Error((await res.json()).detail || res.statusText);
    const d = await res.json();
    const isPhishing = d.phishing_probability > 50;
    const cls = isPhishing ? 'danger' : 'safe';

    document.getElementById('sms-result').className = 'result-box show ' + cls;
    document.getElementById('sms-result').innerHTML = `
      <div class="result-label ${cls}">${isPhishing ? '⚠️ 피싱 의심' : '✅ 정상 메시지'}</div>
      <div style="margin:4px 0 2px;font-size:.82rem;color:var(--text2)">사용 모델: <strong style="color:var(--text)">${d.model}</strong> · 감지 언어: <strong style="color:var(--text)">${d.language === 'ko' ? '한국어' : 'English'}</strong></div>
      <div style="margin-top:14px">
        <div class="prob-row"><span>피싱 확률</span><span style="font-weight:700;color:${isPhishing?'var(--red)':'var(--text2)'}">${d.phishing_probability}%</span></div>
        <div class="prob-bar"><div class="fill danger" style="width:${d.phishing_probability}%"></div></div>
        <div class="prob-row" style="margin-top:8px"><span>정상 확률</span><span style="font-weight:700;color:${!isPhishing?'var(--green)':'var(--text2)'}">${d.normal_probability}%</span></div>
        <div class="prob-bar"><div class="fill safe" style="width:${d.normal_probability}%"></div></div>
      </div>
    `;
  } catch(e) { alert('분석 실패: ' + e.message); }
  finally { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> 분석하기'; }
}

// ─── URL ───────────────────────────────────────
async function predictURL() {
  const url = document.getElementById('url-input').value.trim();
  if(!url) return alert('URL을 입력하세요.');
  const btn = document.getElementById('url-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 분석 중...';
  showLoading('URL 피처 추출 및 모델 분석 중... (10~30초 소요)');

  try {
    const res = await fetch(API + '/api/url/predict', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ url })
    });
    if(!res.ok) throw new Error((await res.json()).detail || res.statusText);
    const d = await res.json();
    const ens = d.ensemble;
    const isPhishing = ens.phishing_probability > 50;
    const cls = isPhishing ? 'danger' : 'safe';

    document.getElementById('url-result').className = 'result-box show ' + cls;
    document.getElementById('url-result').innerHTML = `
      <div class="result-label ${cls}">${isPhishing ? '⚠️ 피싱 의심' : '✅ 안전한 URL'}</div>
      <div style="font-size:.85rem;color:var(--text2);margin-bottom:14px">분석 대상: <strong style="color:var(--text)">${d.url}</strong></div>
      <div class="detail-grid">
        <div class="item">
          <div class="num" style="color:${d.type1.prediction==='피싱'?'var(--red)':'var(--green)'}">${d.type1.phishing_probability}%</div>
          <div class="lbl">Type1 (WHOIS)</div>
        </div>
        <div class="item">
          <div class="num" style="color:${d.type2.prediction==='피싱'?'var(--red)':'var(--green)'}">${d.type2.phishing_probability}%</div>
          <div class="lbl">Type2 (HTML)</div>
        </div>
        <div class="item">
          <div class="num" style="color:${isPhishing?'var(--red)':'var(--green)'}">${ens.phishing_probability}%</div>
          <div class="lbl">앙상블 결과</div>
        </div>
      </div>
      <div style="margin-top:16px">
        <div class="prob-row"><span>앙상블 피싱 확률</span><span style="font-weight:700;color:${isPhishing?'var(--red)':'var(--text2)'}">${ens.phishing_probability}%</span></div>
        <div class="prob-bar"><div class="fill danger" style="width:${ens.phishing_probability}%"></div></div>
      </div>
    `;
  } catch(e) { alert('분석 실패: ' + e.message); }
  finally {
    hideLoading();
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> 분석하기';
  }
}

// ─── Dataset ──────────────────────────────────
let currentDS = 'url_type1';

function loadDataset(name, btnEl) {
  currentDS = name;
  document.querySelectorAll('.ds-tab').forEach(b => { b.classList.remove('active'); b.style.background=''; b.style.borderColor='var(--border)'; b.style.color='var(--text2)'; });
  if(btnEl) { btnEl.classList.add('active'); btnEl.style.background='var(--blue)'; btnEl.style.borderColor='var(--blue)'; btnEl.style.color='#fff'; }
  reloadDataset();
}

async function reloadDataset() {
  const rows = document.getElementById('ds-rows').value;
  document.getElementById('ds-table').innerHTML = '<p style="padding:20px;text-align:center;color:var(--text2)"><span class="spinner" style="border-color:rgba(148,148,168,.3);border-top-color:var(--blue)"></span></p>';

  try {
    const res = await fetch(API + `/api/dataset/preview?name=${currentDS}&rows=${rows}`);
    if(!res.ok) throw new Error('로드 실패');
    const d = await res.json();
    document.getElementById('ds-total').textContent = `총 ${d.total_rows.toLocaleString()}행`;
    document.getElementById('ds-cols').textContent = `${d.columns.length}개 컬럼`;

    let html = '<table><thead><tr>';
    html += '<th>#</th>';
    d.columns.forEach(c => { html += `<th>${esc(c)}</th>`; });
    html += '</tr></thead><tbody>';
    d.data.forEach((row, i) => {
      html += '<tr>';
      html += `<td style="color:var(--text2)">${i+1}</td>`;
      d.columns.forEach(c => { html += `<td>${esc(String(row[c] ?? ''))}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('ds-table').innerHTML = html;
  } catch(e) { document.getElementById('ds-table').innerHTML = `<p style="padding:20px;text-align:center;color:var(--red)">오류: ${e.message}</p>`; }
}

function downloadDataset() {
  window.open(API + `/api/dataset/download?name=${currentDS}`, '_blank');
}

// ─── Util ─────────────────────────────────────
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function showLoading(msg) { document.getElementById('loading-text').textContent = msg; document.getElementById('loading').classList.add('show'); }
function hideLoading() { document.getElementById('loading').classList.remove('show'); }
</script>
</body>
</html>"""
