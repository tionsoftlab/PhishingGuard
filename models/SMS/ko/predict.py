import torch
from transformers import AutoTokenizer
import config
from model import KoBERTClassifier


class PhishingPredictor:
    def __init__(self, model_path=None):
        if model_path is None:
            model_path = config.BEST_MODEL_PATH
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME, trust_remote_code=True)
        
        self.model = KoBERTClassifier(
            num_classes=config.NUM_CLASSES,
            dropout_rate=config.DROPOUT_RATE
        )
        
        checkpoint = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        print(f"모델 로드 완료 (디바이스: {self.device})")
    
    def predict(self, text):
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=config.MAX_LENGTH,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_ids, attention_mask)
            probabilities = torch.softmax(outputs, dim=1)
            predicted_class = torch.argmax(probabilities, dim=1).item()
            confidence = probabilities[0][predicted_class].item()
        
        result = {
            'class': predicted_class,
            'label': '피싱' if predicted_class == 0 else '정상',
            'confidence': confidence * 100,
            'probabilities': {
                '피싱': probabilities[0][0].item() * 100,
                '정상': probabilities[0][1].item() * 100
            }
        }
        
        return result


def main():
    print("=" * 60)
    print("KoBERT 피싱 메시지 분류기")
    print("=" * 60)
    
    predictor = PhishingPredictor()
    
    test_samples = [
        "엄마 나 폰이 고장나서 수리 맡겼어. 급한 일이 생겨서 100만원만 입금해 줄 수 있어?",
        "안녕하세요. 오늘 저녁 약속 시간은 7시로 변경되었습니다. 참고 부탁드립니다.",
        "[코인원] 고객님 계정이 해외IP에서 로그인되었습니다. www.fake-coinone.com",
        "회의 자료 첨부합니다. 검토 후 피드백 부탁드립니다."
    ]
    
    print("\n테스트 샘플 예측:")
    print("=" * 60)
    
    for i, text in enumerate(test_samples, 1):
        print(f"\n[샘플 {i}]")
        print(f"텍스트: {text[:50]}...")
        
        result = predictor.predict(text)
        
        print(f"예측: {result['label']}")
        print(f"신뢰도: {result['confidence']:.2f}%")
        print(f"확률 - 피싱: {result['probabilities']['피싱']:.2f}%, "
              f"정상: {result['probabilities']['정상']:.2f}%")
    
    print("\n" + "=" * 60)
    print("대화형 예측 모드 (종료: 'quit' 입력)")
    print("=" * 60)
    
    while True:
        print("\n메시지를 입력하세요:")
        text = input("> ")
        
        if text.lower() in ['quit', 'exit', 'q']:
            print("\n프로그램을 종료합니다.")
            break
        
        if not text.strip():
            continue
        
        result = predictor.predict(text)
        
        print(f"\n예측 결과: {result['label']}")
        print(f"신뢰도: {result['confidence']:.2f}%")
        print(f"확률 분포 - 피싱: {result['probabilities']['피싱']:.2f}%, "
              f"정상: {result['probabilities']['정상']:.2f}%")


if __name__ == "__main__":
    main()
