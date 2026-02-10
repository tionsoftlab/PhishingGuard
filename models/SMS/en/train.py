import os
import torch
import torch.nn as nn
from torch.optim import AdamW
from transformers import AutoTokenizer
from tqdm import tqdm
import config
from model import RoBERTaClassifier
from data_loader import create_data_loaders


def train_epoch(model, data_loader, criterion, optimizer, device):
    model.train()
    total_loss = 0
    correct = 0
    total = 0
    
    progress_bar = tqdm(data_loader, desc='Training')
    
    for batch in progress_bar:
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['label'].to(device)
        
        optimizer.zero_grad()
        
        outputs = model(input_ids, attention_mask)
        loss = criterion(outputs, labels)
        
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        _, predicted = torch.max(outputs, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()
        
        progress_bar.set_postfix({
            'loss': loss.item(),
            'acc': 100 * correct / total
        })
    
    avg_loss = total_loss / len(data_loader)
    accuracy = 100 * correct / total
    
    return avg_loss, accuracy


def evaluate(model, data_loader, criterion, device):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for batch in tqdm(data_loader, desc='Evaluating'):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            outputs = model(input_ids, attention_mask)
            loss = criterion(outputs, labels)
            
            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
    
    avg_loss = total_loss / len(data_loader)
    accuracy = 100 * correct / total
    
    return avg_loss, accuracy


def main():
    print("=" * 60)
    print("RoBERTa-Large Spam Classification Model Training")
    print("=" * 60)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\nDevice: {device}")
    
    os.makedirs(config.CHECKPOINT_DIR, exist_ok=True)
    
    print(f"\nLoading tokenizer: {config.MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME)
    
    print("\nCreating data loaders...")
    train_loader, val_loader = create_data_loaders(tokenizer)
    
    print("\nInitializing model...")
    model = RoBERTaClassifier(
        num_classes=config.NUM_CLASSES,
        dropout_rate=config.DROPOUT_RATE
    )
    model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = AdamW(model.parameters(), lr=config.LEARNING_RATE)
    
    print(f"\nStarting training (total {config.EPOCHS} epochs)")
    print("=" * 60)
    
    best_val_acc = 0.0
    
    for epoch in range(config.EPOCHS):
        print(f"\n[Epoch {epoch + 1}/{config.EPOCHS}]")
        
        train_loss, train_acc = train_epoch(
            model, train_loader, criterion, optimizer, device
        )
        
        val_loss, val_acc = evaluate(
            model, val_loader, criterion, device
        )
        
        print(f"\nTrain Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                'epoch': epoch + 1,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'val_loss': val_loss,
            }, config.BEST_MODEL_PATH)
            print(f"✓ Best model saved (Val Acc: {val_acc:.2f}%)")
    
    print("\n" + "=" * 60)
    print(f"Training completed! Best validation accuracy: {best_val_acc:.2f}%")
    print(f"Model saved at: {config.BEST_MODEL_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
