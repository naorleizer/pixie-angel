"""
Train FastText + RandomForest transaction categorization model.

Compatible with requirements.txt:
- numpy==1.26.4
- gensim>=4.4.0
- scikit-learn (via litellm dependencies)

Uses train_data.csv and test_data.csv from the model directory.
Outputs models to backend/app/ml_models/

Features:
- Progress bars for all phases
- Checkpoints every 100k samples
- Test accuracy evaluation every 100k samples

Usage:
    cd mockup/model
    python retrain_model.py [--samples N] [--epochs N]
"""
import argparse
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from gensim.models import Word2Vec
from tqdm import tqdm
import pickle
import os
import sys

CHECKPOINT_INTERVAL = 100000  # Save checkpoint and evaluate every 100k samples

def tokenize(text):
    """Simple whitespace tokenizer."""
    return str(text).upper().split()

def text_to_vector(text, model):
    """Convert text to Word2Vec embedding vector."""
    tokens = tokenize(text)
    if not tokens:
        return np.zeros(model.vector_size)
    # Only use tokens that exist in vocabulary (Word2Vec doesn't handle OOV)
    vectors = [model.wv[word] for word in tokens if word in model.wv]
    if not vectors:
        return np.zeros(model.vector_size)
    return np.mean(vectors, axis=0)

def batch_text_to_vectors(texts, model, desc="Converting"):
    """Convert batch of texts to vectors with progress bar."""
    vectors = []
    for text in tqdm(texts, desc=desc):
        vectors.append(text_to_vector(text, model))
    return np.array(vectors)

def save_checkpoint(ft_model, rf_model, checkpoint_dir, sample_count, accuracy=None):
    """Save model checkpoint."""
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    checkpoint_name = f"{sample_count // 1000}k"
    ft_path = os.path.join(checkpoint_dir, f"fasttext_{checkpoint_name}.model")
    rf_path = os.path.join(checkpoint_dir, f"rf_{checkpoint_name}.pkl")
    
    ft_model.save(ft_path)
    with open(rf_path, 'wb') as f:
        pickle.dump(rf_model, f)
    
    acc_str = f" (accuracy: {accuracy:.4f})" if accuracy else ""
    print(f"  💾 Checkpoint saved: {checkpoint_name}{acc_str}")

def main():
    parser = argparse.ArgumentParser(description="Train transaction categorization model")
    parser.add_argument("--samples", type=int, default=100000, help="Number of training samples (default: 100000)")
    parser.add_argument("--epochs", type=int, default=5, help="FastText training epochs (default: 5)")
    parser.add_argument("--test-samples", type=int, default=50000, help="Number of test samples (default: 50000)")
    parser.add_argument("--checkpoint-interval", type=int, default=100000, help="Checkpoint interval (default: 100000)")
    args = parser.parse_args()

    global CHECKPOINT_INTERVAL
    CHECKPOINT_INTERVAL = args.checkpoint_interval

    print("=" * 70)
    print("TRANSACTION CATEGORIZATION MODEL TRAINING")
    print("=" * 70)
    print(f"Config: {args.samples:,} train samples, {args.epochs} epochs")
    print(f"Checkpoints every {CHECKPOINT_INTERVAL:,} samples with accuracy evaluation")

    # Check for required files
    if not os.path.exists("train_data.csv"):
        print("ERROR: train_data.csv not found in current directory")
        print("Run this script from the mockup/model directory")
        sys.exit(1)

    # =========================================================================
    # PHASE 1: Load Data
    # =========================================================================
    print("\n" + "=" * 70)
    print("[1/5] LOADING DATA")
    print("=" * 70)
    
    print("Loading training data...")
    train_df = pd.read_csv("train_data.csv")
    print(f"  Loaded {len(train_df):,} rows")
    
    test_df = None
    if os.path.exists("test_data.csv"):
        print("Loading test data...")
        test_df = pd.read_csv("test_data.csv")
        print(f"  Loaded {len(test_df):,} rows")

    # Sample training data
    sample_size = min(args.samples, len(train_df))
    if sample_size < len(train_df):
        print(f"Sampling {sample_size:,} rows...")
        train_df = train_df.sample(n=sample_size, random_state=42).reset_index(drop=True)

    X_train = train_df['merchant_name'].fillna('').str.upper().values
    y_train = train_df['category'].values

    if test_df is not None:
        test_size = min(args.test_samples, len(test_df))
        X_test = test_df['merchant_name'].fillna('').str.upper().values[:test_size]
        y_test = test_df['category'].values[:test_size]
    else:
        split = int(len(X_train) * 0.8)
        X_test, y_test = X_train[split:], y_train[split:]
        X_train, y_train = X_train[:split], y_train[:split]

    print(f"\n  Train samples: {len(X_train):,}")
    print(f"  Test samples:  {len(X_test):,}")
    print(f"  Categories:    {len(set(y_train))}")

    # =========================================================================
    # PHASE 2: Tokenize
    # =========================================================================
    print("\n" + "=" * 70)
    print("[2/5] TOKENIZING")
    print("=" * 70)
    
    train_tokens = [tokenize(name) for name in tqdm(X_train, desc="Tokenizing train data")]
    print(f"  Tokenized {len(train_tokens):,} samples")

    # =========================================================================
    # PHASE 3: Train Word2Vec
    # =========================================================================
    print("\n" + "=" * 70)
    print("[3/5] TRAINING WORD2VEC EMBEDDINGS")
    print("=" * 70)
    
    ft_model = Word2Vec(
        vector_size=100,
        window=3,
        min_count=1,
        workers=4,
        seed=42
    )

    print("Building vocabulary...")
    ft_model.build_vocab(train_tokens)
    print(f"  Vocabulary size: {len(ft_model.wv):,}")

    print(f"\nTraining Word2Vec for {args.epochs} epochs...")
    for epoch in tqdm(range(args.epochs), desc="Word2Vec epochs"):
        ft_model.train(train_tokens, total_examples=len(train_tokens), epochs=1)
    
    print(f"  Word2Vec training complete!")

    # =========================================================================
    # PHASE 4: Convert to Vectors
    # =========================================================================
    print("\n" + "=" * 70)
    print("[4/5] CONVERTING TO VECTORS")
    print("=" * 70)
    
    X_train_ft = batch_text_to_vectors(X_train, ft_model, desc="Train vectors")
    X_test_ft = batch_text_to_vectors(X_test, ft_model, desc="Test vectors")
    
    print(f"  Train vectors: {X_train_ft.shape}")
    print(f"  Test vectors:  {X_test_ft.shape}")

    # =========================================================================
    # PHASE 5: Train RandomForest with Checkpoints
    # =========================================================================
    print("\n" + "=" * 70)
    print("[5/5] TRAINING RANDOMFOREST WITH CHECKPOINTS")
    print("=" * 70)
    
    checkpoint_dir = "checkpoints"
    output_dir = "../backend/app/ml_models"
    os.makedirs(checkpoint_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    # Training with incremental checkpoints
    results = []
    total_samples = len(X_train_ft)
    
    print(f"\nTraining with checkpoints every {CHECKPOINT_INTERVAL:,} samples...")
    print(f"{'Samples':>12} | {'Train Acc':>10} | {'Test Acc':>10} | {'Gap':>8}")
    print("-" * 50)

    # Determine checkpoint points
    checkpoint_points = list(range(CHECKPOINT_INTERVAL, total_samples + 1, CHECKPOINT_INTERVAL))
    if total_samples not in checkpoint_points:
        checkpoint_points.append(total_samples)

    for checkpoint_samples in tqdm(checkpoint_points, desc="Training checkpoints"):
        # Train on subset
        X_subset = X_train_ft[:checkpoint_samples]
        y_subset = y_train[:checkpoint_samples]
        
        rf = RandomForestClassifier(
            n_estimators=50,
            max_depth=25,
            min_samples_split=10,
            min_samples_leaf=4,
            max_features='sqrt',
            bootstrap=True,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        rf.fit(X_subset, y_subset)
        
        # Evaluate on training subset (sample for speed)
        train_eval_size = min(50000, len(X_subset))
        train_eval_idx = np.random.choice(len(X_subset), train_eval_size, replace=False)
        y_train_pred = rf.predict(X_subset[train_eval_idx])
        train_acc = accuracy_score(y_subset[train_eval_idx], y_train_pred)
        
        # Evaluate on test set
        y_test_pred = rf.predict(X_test_ft)
        test_acc = accuracy_score(y_test, y_test_pred)
        
        gap = train_acc - test_acc
        
        results.append({
            'samples': checkpoint_samples,
            'train_acc': train_acc,
            'test_acc': test_acc,
            'gap': gap
        })
        
        print(f"{checkpoint_samples:>12,} | {train_acc:>10.4f} | {test_acc:>10.4f} | {gap:>8.4f}")
        
        # Save checkpoint
        save_checkpoint(ft_model, rf, checkpoint_dir, checkpoint_samples, test_acc)

    # =========================================================================
    # SAVE FINAL MODELS
    # =========================================================================
    print("\n" + "=" * 70)
    print("SAVING FINAL MODELS")
    print("=" * 70)

    ft_path = f"{output_dir}/word2vec_model_hf.model"
    rf_path = f"{output_dir}/transaction_classifier_ft_hf.pkl"

    ft_model.save(ft_path)
    with open(rf_path, 'wb') as f:
        pickle.dump(rf, f)

    print(f"  Word2Vec:     {ft_path}")
    print(f"  RandomForest: {rf_path}")

    # Save training results
    results_df = pd.DataFrame(results)
    results_df.to_csv("training_results.csv", index=False)
    print(f"  Results:      training_results.csv")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print("TRAINING COMPLETE!")
    print("=" * 70)
    print(f"Total samples trained: {total_samples:,}")
    print(f"Final test accuracy:   {results[-1]['test_acc']:.4f}")
    print(f"Checkpoints saved:     {len(checkpoint_points)}")
    print("=" * 70)

if __name__ == "__main__":
    main()
