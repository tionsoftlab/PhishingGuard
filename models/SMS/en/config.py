import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'dataset.csv')
CHECKPOINT_DIR = os.path.join(BASE_DIR, 'checkpoints')
BEST_MODEL_PATH = os.path.join(CHECKPOINT_DIR, 'best_model.pt')

MODEL_NAME = 'roberta-large'
MAX_LENGTH = 256
NUM_CLASSES = 2

BATCH_SIZE = 16
LEARNING_RATE = 2e-5
EPOCHS = 5
TRAIN_TEST_SPLIT = 0.2
RANDOM_STATE = 42

DROPOUT_RATE = 0.3

DEVICE = 'cuda'
