import torch
import torch.nn as nn
from transformers import AutoModel
import config


class RoBERTaClassifier(nn.Module):
    def __init__(self, num_classes=2, dropout_rate=0.3):
        super(RoBERTaClassifier, self).__init__()
        
        self.roberta = AutoModel.from_pretrained(config.MODEL_NAME)
        
        self.dropout = nn.Dropout(dropout_rate)
        
        self.classifier = nn.Linear(
            self.roberta.config.hidden_size,
            num_classes
        )
    
    def forward(self, input_ids, attention_mask):
        outputs = self.roberta(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        
        pooled_output = outputs.pooler_output
        
        pooled_output = self.dropout(pooled_output)
        
        logits = self.classifier(pooled_output)
        
        return logits


if __name__ == "__main__":
    print("Initializing model...")
    model = RoBERTaClassifier(
        num_classes=config.NUM_CLASSES,
        dropout_rate=config.DROPOUT_RATE
    )
    
    print(f"\nModel architecture:")
    print(model)
    
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    
    print(f"\nTotal parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    
    batch_size = 4
    seq_length = config.MAX_LENGTH
    
    dummy_input_ids = torch.randint(0, 1000, (batch_size, seq_length))
    dummy_attention_mask = torch.ones((batch_size, seq_length))
    
    print(f"\nTest input shape: {dummy_input_ids.shape}")
    
    with torch.no_grad():
        outputs = model(dummy_input_ids, dummy_attention_mask)
    
    print(f"Output shape: {outputs.shape}")
    print(f"Output values (logits): {outputs}")
