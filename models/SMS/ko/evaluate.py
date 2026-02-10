import torch
from transformers import AutoTokenizer
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np
import config
from model import KoBERTClassifier
from data_loader import create_data_loaders


def evaluate_model():
    print("=" * 60)
    print("모델 평가")
    print("=" * 60)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\n사용 디바이스: {device}")
    
    print(f"\n토크나이저 로딩: {config.MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME, trust_remote_code=True)
    
    print("\n데이터 로더 생성 중...")
    _, val_loader = create_data_loaders(tokenizer)
    
    print("\n학습된 모델 로딩...")
    model = KoBERTClassifier(
        num_classes=config.NUM_CLASSES,
        dropout_rate=config.DROPOUT_RATE
    )
    
    checkpoint = torch.load(config.BEST_MODEL_PATH, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    print(f"체크포인트 정보:")
    print(f"  Epoch: {checkpoint['epoch']}")
    print(f"  Val Accuracy: {checkpoint['val_acc']:.2f}%")
    print(f"  Val Loss: {checkpoint['val_loss']:.4f}")
    
    print("\n예측 중...")
    all_predictions = []
    all_labels = []
    
    with torch.no_grad():
        for batch in val_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            outputs = model(input_ids, attention_mask)
            _, predicted = torch.max(outputs, 1)
            
            all_predictions.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    all_predictions = np.array(all_predictions)
    all_labels = np.array(all_labels)
    
    print("\n혼동 행렬:")
    cm = confusion_matrix(all_labels, all_predictions)
    print(cm)
    
    print("\n분류 리포트:")
    target_names = ['피싱 (0)', '정상 (1)']
    print(classification_report(all_labels, all_predictions, target_names=target_names))
    
    accuracy = 100 * np.sum(all_predictions == all_labels) / len(all_labels)
    print(f"\n최종 정확도: {accuracy:.2f}%")
    
    print("=" * 60)


if __name__ == "__main__":
    evaluate_model()
