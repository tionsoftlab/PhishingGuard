import torch
from transformers import AutoTokenizer
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import config
from model import RoBERTaClassifier
from data_loader import create_data_loaders


def evaluate_model():
    print("=" * 60)
    print("RoBERTa-Large Spam Classifier Evaluation")
    print("=" * 60)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\nDevice: {device}")
    
    print(f"\nLoading tokenizer: {config.MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME)
    
    print("\nLoading data...")
    _, val_loader = create_data_loaders(tokenizer)
    
    print("\nLoading model...")
    model = RoBERTaClassifier(
        num_classes=config.NUM_CLASSES,
        dropout_rate=config.DROPOUT_RATE
    )
    
    checkpoint = torch.load(config.BEST_MODEL_PATH, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    print(f"✓ Model loaded from epoch {checkpoint['epoch']}")
    print(f"  Validation Accuracy: {checkpoint['val_acc']:.2f}%")
    print(f"  Validation Loss: {checkpoint['val_loss']:.4f}")
    
    print("\nGenerating predictions...")
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for batch in val_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            outputs = model(input_ids, attention_mask)
            _, predicted = torch.max(outputs, 1)
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    print("\n" + "=" * 60)
    print("Classification Report")
    print("=" * 60)
    print(classification_report(
        all_labels, all_preds,
        target_names=['Spam', 'Normal']
    ))
    
    print("\nGenerating confusion matrix...")
    cm = confusion_matrix(all_labels, all_preds)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=['Spam', 'Normal'],
        yticklabels=['Spam', 'Normal']
    )
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    
    output_path = 'confusion_matrix.png'
    plt.savefig(output_path)
    print(f"✓ Confusion matrix saved to: {output_path}")
    
    print("\n" + "=" * 60)
    print("Evaluation completed!")
    print("=" * 60)


if __name__ == "__main__":
    evaluate_model()
