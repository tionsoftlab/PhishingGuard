import torch
import torch.nn.functional as F
from transformers import AutoTokenizer
import config
from model import RoBERTaClassifier


class SpamPredictor:
    def __init__(self, model_path=None):
        """Initialize predictor"""
        if model_path is None:
            model_path = config.BEST_MODEL_PATH
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME)
        
        self.model = RoBERTaClassifier(
            num_classes=config.NUM_CLASSES,
            dropout_rate=config.DROPOUT_RATE
        )
        
        checkpoint = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        self.labels = ['Spam', 'Normal']
    
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
            probabilities = F.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
        
        predicted_label = self.labels[predicted.item()]
        confidence_score = confidence.item() * 100
        
        spam_prob = probabilities[0][0].item() * 100
        normal_prob = probabilities[0][1].item() * 100
        
        return {
            'label': predicted_label,
            'confidence': confidence_score,
            'spam_probability': spam_prob,
            'normal_probability': normal_prob
        }
    
    def predict_batch(self, texts):
        results = []
        for text in texts:
            results.append(self.predict(text))
        return results


def interactive_mode():
    print("=" * 60)
    print("RoBERTa-Large Spam Classifier - Interactive Mode")
    print("=" * 60)
    print("\nLoading model...")
    
    predictor = SpamPredictor()
    
    print("✓ Model loaded successfully!")
    print("\nEnter messages to classify (type 'quit' to exit)")
    print("-" * 60)
    
    while True:
        text = input("\nMessage: ").strip()
        
        if text.lower() in ['quit', 'exit', 'q']:
            print("\nExiting...")
            break
        
        if not text:
            print("Please enter a message.")
            continue
        
        result = predictor.predict(text)
        
        print(f"\n{'=' * 40}")
        print(f"Prediction: {result['label']}")
        print(f"Confidence: {result['confidence']:.2f}%")
        print(f"Probabilities - Spam: {result['spam_probability']:.2f}%, Normal: {result['normal_probability']:.2f}%")
        print(f"{'=' * 40}")


def demo_predictions():
    predictor = SpamPredictor()
    
    examples = [
        "Hey, are we still on for dinner tonight?",
        "WINNER!! You have won a $1000 cash prize! Click here to claim now!",
        "Hi mom, can you pick me up from school?",
        "FREE entry to win iPhone! Text WIN to 12345",
        "Meeting rescheduled to 3pm tomorrow"
    ]
    
    print("\n" + "=" * 60)
    print("Demo Predictions")
    print("=" * 60)
    
    for i, text in enumerate(examples, 1):
        result = predictor.predict(text)
        print(f"\n[Example {i}]")
        print(f"Message: {text}")
        print(f"→ Prediction: {result['label']} ({result['confidence']:.2f}%)")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--demo':
        print("Running demo mode...")
        demo_predictions()
    else:
        interactive_mode()
