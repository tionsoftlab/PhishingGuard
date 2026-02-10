import torch
import torch.nn as nn
from transformers import AutoModel
import config


class KoBERTClassifier(nn.Module):    
    def __init__(self, num_classes=2, dropout_rate=0.3):
        super(KoBERTClassifier, self).__init__()
        
        self.kobert = AutoModel.from_pretrained(
            config.MODEL_NAME,
            trust_remote_code=True
        )
        
        self.dropout = nn.Dropout(dropout_rate)
        
        self.classifier = nn.Linear(
            self.kobert.config.hidden_size,
            num_classes
        )
    
    def forward(self, input_ids, attention_mask):
        """순전파"""
        outputs = self.kobert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        pooled_output = outputs.pooler_output
        
        pooled_output = self.dropout(pooled_output)
        
        logits = self.classifier(pooled_output)
        
        return logits


if __name__ == "__main__":
    print("모델 초기화 중...")
    model = KoBERTClassifier(
        num_classes=config.NUM_CLASSES,
        dropout_rate=config.DROPOUT_RATE
    )
    
    print(f"\n모델 구조:")
    print(model)
    
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    
    print(f"\n총 파라미터 수: {total_params:,}")
    print(f"학습 가능한 파라미터 수: {trainable_params:,}")
    
    batch_size = 4
    seq_length = config.MAX_LENGTH
    
    dummy_input_ids = torch.randint(0, 1000, (batch_size, seq_length))
    dummy_attention_mask = torch.ones((batch_size, seq_length))
    
    print(f"\n테스트 입력 shape: {dummy_input_ids.shape}")
    
    with torch.no_grad():
        outputs = model(dummy_input_ids, dummy_attention_mask)
    
    print(f"출력 shape: {outputs.shape}")
    print(f"출력 값 (logits): {outputs}")
