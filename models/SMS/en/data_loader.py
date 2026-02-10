import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer
from sklearn.model_selection import train_test_split
import config


class SpamDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }


def load_data():
    print(f"Loading data from: {config.DATA_PATH}")
    
    df = pd.read_csv(config.DATA_PATH, encoding='latin1')
    
    df = df[['v1', 'v2']]
    df.columns = ['label', 'text']
    
    df['label'] = df['label'].map({-1: 0, 1: 1})
    
    df = df.dropna()
    
    print(f"Total samples: {len(df)}")
    print(f"Label distribution:\n{df['label'].value_counts()}")
    
    return df['text'].values, df['label'].values


def create_data_loaders(tokenizer):
    texts, labels = load_data()
    
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels,
        test_size=config.TRAIN_TEST_SPLIT,
        random_state=config.RANDOM_STATE,
        stratify=labels
    )
    
    print(f"\nTraining data: {len(train_texts)} samples")
    print(f"Validation data: {len(val_texts)} samples")
    
    train_dataset = SpamDataset(
        train_texts, train_labels, tokenizer, config.MAX_LENGTH
    )
    val_dataset = SpamDataset(
        val_texts, val_labels, tokenizer, config.MAX_LENGTH
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config.BATCH_SIZE,
        shuffle=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config.BATCH_SIZE,
        shuffle=False
    )
    
    return train_loader, val_loader


if __name__ == "__main__":
    tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME)
    train_loader, val_loader = create_data_loaders(tokenizer)
    
    print(f"\nBatch size: {config.BATCH_SIZE}")
    print(f"Total training batches: {len(train_loader)}")
    print(f"Total validation batches: {len(val_loader)}")
    
    batch = next(iter(train_loader))
    print(f"\nSample batch shapes:")
    print(f"  input_ids: {batch['input_ids'].shape}")
    print(f"  attention_mask: {batch['attention_mask'].shape}")
    print(f"  label: {batch['label'].shape}")
