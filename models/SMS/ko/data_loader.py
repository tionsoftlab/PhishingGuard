import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer
from sklearn.model_selection import train_test_split
import config


class PhishingDataset(Dataset):
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
    print(f"데이터 로딩 중: {config.DATA_PATH}")
    
    df = pd.read_csv(config.DATA_PATH)
    
    df['class'] = df['class'].map({-1: 0, 1: 1})
    
    print(f"총 샘플 수: {len(df)}")
    print(f"레이블 분포:\n{df['class'].value_counts()}")
    
    return df['content'].values, df['class'].values


def create_data_loaders(tokenizer):
    texts, labels = load_data()
    
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels,
        test_size=config.TRAIN_TEST_SPLIT,
        random_state=config.RANDOM_STATE,
        stratify=labels
    )
    
    print(f"\n학습 데이터: {len(train_texts)}개")
    print(f"검증 데이터: {len(val_texts)}개")
    
    train_dataset = PhishingDataset(
        train_texts, train_labels, tokenizer, config.MAX_LENGTH
    )
    val_dataset = PhishingDataset(
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
    tokenizer = AutoTokenizer.from_pretrained(config.MODEL_NAME, trust_remote_code=True)
    train_loader, val_loader = create_data_loaders(tokenizer)
    
    print(f"\n배치 크기: {config.BATCH_SIZE}")
    print(f"총 학습 배치 수: {len(train_loader)}")
    print(f"총 검증 배치 수: {len(val_loader)}")
    
    batch = next(iter(train_loader))
    print(f"\n샘플 배치 shape:")
    print(f"  input_ids: {batch['input_ids'].shape}")
    print(f"  attention_mask: {batch['attention_mask'].shape}")
    print(f"  label: {batch['label'].shape}")
