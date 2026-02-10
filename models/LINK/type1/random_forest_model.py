import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

print("데이터 로드 중...")
df = pd.read_csv('dataset_type1.csv')

print(f"데이터 형태: {df.shape}")
print(f"\n처음 5개 행:")
print(df.head())

print(f"\n데이터 정보:")
print(df.info())

print(f"\n결측치 확인:")
print(df.isnull().sum())

print(f"\n타겟 분포:")
print(df['Type'].value_counts())

print("\n데이터 전처리 중...")
df_processed = df.copy()

categorical_columns = ['CHARSET', 'SERVER', 'WHOIS_COUNTRY', 'WHOIS_STATEPRO']

label_encoders = {}
for col in categorical_columns:
    le = LabelEncoder()
    df_processed[col] = df_processed[col].astype(str)
    df_processed[col] = le.fit_transform(df_processed[col])
    label_encoders[col] = le

numeric_columns = ['URL_LENGTH', 'NUMBER_SPECIAL_CHARACTERS', 'CONTENT_LENGTH', 
                   'WHOIS_DATE_DIFF', 'DNS_QUERY_TIMES']

for col in numeric_columns:
    df_processed.loc[df_processed[col] == -1, col] = np.nan
    mean_val = df_processed[col].mean()
    df_processed[col].fillna(mean_val, inplace=True)

X = df_processed.drop('Type', axis=1)
y = df_processed['Type']

y = y.map({-1: 0, 1: 1})

print(f"\n특징 변수: {X.columns.tolist()}")
print(f"특징 변수 형태: {X.shape}")
print(f"타겟 변수 형태: {y.shape}")

print("\n학습/테스트 데이터 분리 중...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"학습 데이터: {X_train.shape}")
print(f"테스트 데이터: {X_test.shape}")

print("\n랜덤 포레스트 모델 학습 중...")
rf_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1,
    verbose=1
)

rf_model.fit(X_train, y_train)

print("\n예측 수행 중...")
y_pred = rf_model.predict(X_test)
y_pred_proba = rf_model.predict_proba(X_test)

print("\n" + "="*50)
print("모델 평가 결과")
print("="*50)

accuracy = accuracy_score(y_test, y_pred)
print(f"\n정확도: {accuracy:.4f} ({accuracy*100:.2f}%)")

print("\n혼동 행렬:")
cm = confusion_matrix(y_test, y_pred)
print(cm)

print("\n분류 리포트:")
print(classification_report(y_test, y_pred, target_names=['정상(0)', '피싱(1)']))

print("\n특징 중요도:")
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)

print(feature_importance)

print("\n시각화 생성 중...")

plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=['정상', '피싱'],
            yticklabels=['정상', '피싱'])
plt.title('혼동 행렬 (Confusion Matrix)')
plt.ylabel('실제 값')
plt.xlabel('예측 값')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=300, bbox_inches='tight')
print("혼동 행렬 저장: confusion_matrix.png")

plt.figure(figsize=(10, 6))
sns.barplot(data=feature_importance, x='importance', y='feature', palette='viridis')
plt.title('특징 중요도 (Feature Importance)')
plt.xlabel('중요도')
plt.ylabel('특징')
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=300, bbox_inches='tight')
print("특징 중요도 저장: feature_importance.png")

print("\n모델 저장 중...")
joblib.dump(rf_model, 'random_forest_model.pkl')
print("모델 저장 완료: random_forest_model.pkl")

joblib.dump(label_encoders, 'label_encoders.pkl')
print("인코더 저장 완료: label_encoders.pkl")

print("\n" + "="*50)
print("모델 학습 및 평가 완료!")
print("="*50)

print("\n샘플 예측 예제:")
print("테스트 데이터의 처음 5개 샘플 예측 결과:")
sample_results = pd.DataFrame({
    '실제값': y_test.iloc[:5].values,
    '예측값': y_pred[:5],
    '정상 확률': y_pred_proba[:5, 0],
    '피싱 확률': y_pred_proba[:5, 1]
})
print(sample_results)

import json
results = {
    'model_type': 'Random Forest',
    'dataset': 'Type1',
    'accuracy': float(accuracy),
    'confusion_matrix': cm.tolist(),
    'n_estimators': 100,
    'max_depth': 15
}
with open('type1_rf_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print('\n결과 저장 완료: type1_rf_results.json')
