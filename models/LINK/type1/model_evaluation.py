import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

print("모델 로드 중...")
rf_model = joblib.load('random_forest_model.pkl')
label_encoders = joblib.load('label_encoders.pkl')

df = pd.read_csv('dataset_type1.csv')
print(f"데이터 형태: {df.shape}\n")

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

df_processed = df.copy()

categorical_columns = ['CHARSET', 'SERVER', 'WHOIS_COUNTRY', 'WHOIS_STATEPRO']
for col in categorical_columns:
    le = label_encoders[col]
    df_processed[col] = df_processed[col].astype(str)
    df_processed[col] = le.transform(df_processed[col])

numeric_columns = ['URL_LENGTH', 'NUMBER_SPECIAL_CHARACTERS', 'CONTENT_LENGTH', 
                   'WHOIS_DATE_DIFF', 'DNS_QUERY_TIMES']
for col in numeric_columns:
    df_processed.loc[df_processed[col] == -1, col] = np.nan
    mean_val = df_processed[col].mean()
    df_processed[col].fillna(mean_val, inplace=True)

X = df_processed.drop('Type', axis=1)
y = df_processed['Type']
y = y.map({-1: 0, 1: 1})

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

y_pred = rf_model.predict(X_test)
y_pred_proba = rf_model.predict_proba(X_test)

print("="*60)
print("랜덤 포레스트 모델 평가 결과")
print("="*60)

accuracy = accuracy_score(y_test, y_pred)
print(f"\n정확도: {accuracy:.4f} ({accuracy*100:.2f}%)")

print("\n혼동 행렬:")
cm = confusion_matrix(y_test, y_pred)
print(cm)
print(f"\n- 정상을 정상으로 예측: {cm[0][0]}개")
print(f"- 정상을 피싱으로 오분류: {cm[0][1]}개")
print(f"- 피싱을 정상으로 오분류: {cm[1][0]}개")
print(f"- 피싱을 피싱으로 예측: {cm[1][1]}개")

print("\n분류 리포트:")
print(classification_report(y_test, y_pred, target_names=['정상(0)', '피싱(1)']))

print("\n특징 중요도 (상위 10개):")
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)
print(feature_importance.to_string(index=False))

print("\n모델 정보:")
print(f"- 트리 개수: {rf_model.n_estimators}")
print(f"- 최대 깊이: {rf_model.max_depth}")
print(f"- 특징 개수: {rf_model.n_features_in_}")
print(f"- 클래스 개수: {len(rf_model.classes_)}")

print("\n" + "="*60)
print("모델 평가 완료!")
print("="*60)
print("\n생성된 파일:")
print("- random_forest_model.pkl (모델 파일)")
print("- label_encoders.pkl (인코더 파일)")
print("- confusion_matrix.png (혼동 행렬 이미지)")
print("- feature_importance.png (특징 중요도 이미지)")
