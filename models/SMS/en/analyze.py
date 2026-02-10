import os
import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from transformers import AutoTokenizer
from sklearn.metrics import (
    classification_report, 
    confusion_matrix,
    roc_curve,
    auc,
    precision_recall_curve,
    average_precision_score
)
import config
from model import RoBERTaClassifier
from data_loader import create_data_loaders


def plot_confusion_matrix(y_true, y_pred, save_path='confusion_matrix.png'):
    cm = confusion_matrix(y_true, y_pred)
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['피싱', '정상'],
                yticklabels=['피싱', '정상'],
                cbar_kws={'label': '샘플 수'})
    
    plt.title('혼동 행렬 (Confusion Matrix) - EN 모델', fontsize=16, pad=20)
    plt.ylabel('실제 레이블', fontsize=12)
    plt.xlabel('예측 레이블', fontsize=12)
    
    accuracy = np.trace(cm) / np.sum(cm)
    plt.text(1, 2.3, f'정확도: {accuracy:.4f} ({accuracy*100:.2f}%)', 
             ha='center', fontsize=12, weight='bold')
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ 혼동 행렬 저장: {save_path}")
    plt.close()


def plot_roc_curve(y_true, y_probs, save_path='roc_curve.png'):
    fpr, tpr, thresholds = roc_curve(y_true, y_probs)
    roc_auc = auc(fpr, tpr)
    
    plt.figure(figsize=(10, 8))
    plt.plot(fpr, tpr, color='darkorange', lw=2, 
             label=f'ROC curve (AUC = {roc_auc:.4f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', 
             label='Random Classifier')
    
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate (위양성률)', fontsize=12)
    plt.ylabel('True Positive Rate (재현율)', fontsize=12)
    plt.title('ROC Curve - EN 모델', fontsize=16, pad=20)
    plt.legend(loc="lower right", fontsize=10)
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ ROC 곡선 저장: {save_path}")
    plt.close()
    
    return roc_auc


def plot_precision_recall_curve(y_true, y_probs, save_path='precision_recall_curve.png'):
    precision, recall, thresholds = precision_recall_curve(y_true, y_probs)
    avg_precision = average_precision_score(y_true, y_probs)
    
    plt.figure(figsize=(10, 8))
    plt.plot(recall, precision, color='blue', lw=2,
             label=f'PR curve (AP = {avg_precision:.4f})')
    
    plt.xlabel('Recall (재현율)', fontsize=12)
    plt.ylabel('Precision (정밀도)', fontsize=12)
    plt.title('Precision-Recall Curve - EN 모델', fontsize=16, pad=20)
    plt.legend(loc="lower left", fontsize=10)
    plt.grid(True, alpha=0.3)
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Precision-Recall 곡선 저장: {save_path}")
    plt.close()
    
    return avg_precision


def plot_class_distribution(y_true, y_pred, save_path='class_distribution.png'):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    labels = ['피싱', '정상']
    colors = ['#ff9999', '#66b3ff']
    
    true_counts = np.bincount(y_true)
    ax1.bar(labels, true_counts, color=colors, alpha=0.7, edgecolor='black')
    ax1.set_title('실제 레이블 분포', fontsize=14, pad=10)
    ax1.set_ylabel('샘플 수', fontsize=12)
    for i, v in enumerate(true_counts):
        ax1.text(i, v + 50, str(v), ha='center', va='bottom', fontsize=11, weight='bold')
    
    pred_counts = np.bincount(y_pred)
    ax2.bar(labels, pred_counts, color=colors, alpha=0.7, edgecolor='black')
    ax2.set_title('예측 레이블 분포 (EN 모델)', fontsize=14, pad=10)
    ax2.set_ylabel('샘플 수', fontsize=12)
    for i, v in enumerate(pred_counts):
        ax2.text(i, v + 50, str(v), ha='center', va='bottom', fontsize=11, weight='bold')
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ 클래스 분포 그래프 저장: {save_path}")
    plt.close()


def plot_performance_metrics(report_dict, save_path='performance_metrics.png'):
    metrics = ['precision', 'recall', 'f1-score']
    phishing_scores = [report_dict['0'][m] for m in metrics]
    normal_scores = [report_dict['1'][m] for m in metrics]
    
    x = np.arange(len(metrics))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(12, 7))
    bars1 = ax.bar(x - width/2, phishing_scores, width, label='피싱', 
                   color='#ff9999', edgecolor='black', alpha=0.7)
    bars2 = ax.bar(x + width/2, normal_scores, width, label='정상', 
                   color='#66b3ff', edgecolor='black', alpha=0.7)
    
    ax.set_xlabel('평가 지표', fontsize=12)
    ax.set_ylabel('점수', fontsize=12)
    ax.set_title('클래스별 성능 지표 - EN 모델', fontsize=16, pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(['Precision\n(정밀도)', 'Recall\n(재현율)', 'F1-Score'])
    ax.legend(fontsize=11)
    ax.set_ylim([0, 1.1])
    ax.grid(True, alpha=0.3, axis='y')
    
    def autolabel(bars):
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.4f}',
                       xy=(bar.get_x() + bar.get_width() / 2, height),
                       xytext=(0, 3),
                       textcoords="offset points",
                       ha='center', va='bottom', fontsize=10, weight='bold')
    
    autolabel(bars1)
    autolabel(bars2)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ 성능 지표 그래프 저장: {save_path}")
    plt.close()


def analyze_model_with_en():
    print("=" * 70)
    print("영어 모델(EN.PT)을 사용한 피싱 메시지 분류 모델 - 상세 분석")
    print("=" * 70)
    
    output_dir = 'analysis_results'
    os.makedirs(output_dir, exist_ok=True)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\n사용 디바이스: {device}")
    
    # EN 모델용 토크나이저 사용 (roberta-large)
    model_name = 'roberta-large'
    print(f"\n토크나이저 로딩: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    
    print("\n데이터 로더 생성 중...")
    _, val_loader = create_data_loaders(tokenizer)
    
    print("\nEN 모델 로딩...")
    model = RoBERTaClassifier(
        num_classes=config.NUM_CLASSES,
        dropout_rate=config.DROPOUT_RATE
    )
    
    # EN.PT 모델 경로 설정
    en_model_path = 'en.pt'
    print(f"EN 모델 경로: {en_model_path}")
    
    checkpoint = torch.load(en_model_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    print(f"\n체크포인트 정보:")
    print(f"  Epoch: {checkpoint['epoch']}")
    print(f"  Val Accuracy: {checkpoint['val_acc']:.2f}%")
    print(f"  Val Loss: {checkpoint['val_loss']:.4f}")
    
    print("\n모델 예측 중...")
    all_predictions = []
    all_labels = []
    all_probs = []
    
    with torch.no_grad():
        for batch in val_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            outputs = model(input_ids, attention_mask)
            probs = torch.softmax(outputs, dim=1)
            _, predicted = torch.max(outputs, 1)
            
            all_predictions.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())
    
    all_predictions = np.array(all_predictions)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)
    
    print("\n" + "=" * 70)
    print("분류 리포트 (EN 모델)")
    print("=" * 70)
    target_names = ['피싱 (0)', '정상 (1)']
    report = classification_report(all_labels, all_predictions, 
                                   target_names=target_names, 
                                   digits=4)
    print(report)
    
    report_dict = classification_report(all_labels, all_predictions, 
                                        target_names=['0', '1'],
                                        output_dict=True)
    
    print("\n" + "=" * 70)
    print("시각화 생성 중...")
    print("=" * 70)
    
    plot_confusion_matrix(all_labels, all_predictions, 
                         os.path.join(output_dir, 'confusion_matrix_en.png'))
    
    roc_auc = plot_roc_curve(all_labels, all_probs, 
                             os.path.join(output_dir, 'roc_curve_en.png'))
    
    avg_precision = plot_precision_recall_curve(all_labels, all_probs,
                                                os.path.join(output_dir, 'precision_recall_curve_en.png'))
    
    plot_class_distribution(all_labels, all_predictions,
                           os.path.join(output_dir, 'class_distribution_en.png'))
    
    plot_performance_metrics(report_dict,
                            os.path.join(output_dir, 'performance_metrics_en.png'))
    
    print("\n" + "=" * 70)
    print("종합 성능 지표 (EN 모델)")
    print("=" * 70)
    
    accuracy = 100 * np.sum(all_predictions == all_labels) / len(all_labels)
    print(f"정확도 (Accuracy): {accuracy:.2f}%")
    print(f"ROC AUC: {roc_auc:.4f}")
    print(f"Average Precision: {avg_precision:.4f}")
    
    print("\n클래스별 상세 지표:")
    for class_name in ['0', '1']:
        class_label = '피싱' if class_name == '0' else '정상'
        print(f"\n[{class_label}]")
        print(f"  Precision: {report_dict[class_name]['precision']:.4f}")
        print(f"  Recall:    {report_dict[class_name]['recall']:.4f}")
        print(f"  F1-Score:  {report_dict[class_name]['f1-score']:.4f}")
        print(f"  Support:   {int(report_dict[class_name]['support'])} 샘플")
    
    print("\n" + "=" * 70)
    print(f"모든 분석 결과가 '{output_dir}' 디렉토리에 저장되었습니다.")
    print("=" * 70)
    
    print("\n생성된 파일:")
    for filename in sorted(os.listdir(output_dir)):
        if filename.endswith('.png'):
            print(f"  - {os.path.join(output_dir, filename)}")


if __name__ == "__main__":
    plt.rcParams['font.family'] = 'Malgun Gothic'
    plt.rcParams['axes.unicode_minus'] = False
    
    analyze_model_with_en()