# Ollama Setup & Fine-Tuning Guide for RepoTalk

## Part 1: Setting Up Ollama as a Groq Fallback

### Step 1 — Install Ollama

Download Ollama for Windows from [https://ollama.com/download](https://ollama.com/download). It installs as a system service that runs in the background.

After installation, verify it's running:
```powershell
ollama --version
# Should print something like: ollama version 0.5.x
```

Ollama runs an OpenAI-compatible API at `http://localhost:11434`.

---

### Step 2 — Pull a Model

For RepoTalk's RAG pipeline (answering questions about code), you need a model that is:
- Good at following instructions
- Good at code understanding
- Runs well on 8–16 GB RAM

> [!IMPORTANT]
> **Recommended models (pick ONE based on your hardware):**

| Model | VRAM/RAM Needed | Quality | Command |
|---|---|---|---|
| `llama3.1:8b` | ~5 GB | Good | `ollama pull llama3.1:8b` |
| `llama3.2:3b` | ~2.5 GB | OK (faster) | `ollama pull llama3.2:3b` |
| `codellama:13b` | ~8 GB | Great for code | `ollama pull codellama:13b` |
| `deepseek-coder-v2:16b` | ~10 GB | Best for code | `ollama pull deepseek-coder-v2:16b` |
| `qwen2.5-coder:7b` | ~5 GB | Great balance | `ollama pull qwen2.5-coder:7b` |

**My recommendation for your use case:**

```powershell
# Best quality-to-size ratio for code Q&A:
ollama pull qwen2.5-coder:7b

# Fast & lightweight fallback:
ollama pull llama3.2:3b
```

---

### Step 3 — Test the Model Locally

```powershell
# Interactive chat test
ollama run qwen2.5-coder:7b

# API test (from another terminal)
curl http://localhost:11434/v1/chat/completions -d '{
  "model": "qwen2.5-coder:7b",
  "messages": [{"role": "user", "content": "Explain what a RAG pipeline does in 2 sentences."}]
}'
```

---

### Step 4 — Configure RepoTalk `.env`

Your `.env` already has the Ollama settings. Update the model name to match:

```env
# .env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

> [!NOTE]
> **Your code already has automatic fallback!** In `query.py`, when Groq hits a `RateLimitError`, it automatically tries Ollama via `_try_ollama_completion()`. No code changes needed for the fallback chain to work.

---

### Step 5 — Test the Fallback Chain

```powershell
# Start Ollama (it auto-starts on Windows, but just in case)
ollama serve

# Start your AI service
cd C:\dev\RepoTalk\ai_service
python -m uvicorn app.main:app --reload --port 8000

# Test a query — it will use Groq first, then Ollama if Groq fails
```

---

## Part 2: Fine-Tuning a Model for RepoTalk

### Why Fine-Tune?

Your current setup uses **Groq → Ollama** with a generic system prompt. Fine-tuning gives you:

1. **Better citation formatting** — The model learns to always produce `[file.py:10-25]` citations
2. **Better code explanation style** — Matches your "Summary → Details" format
3. **Smaller model, same quality** — A fine-tuned 3B model can match a generic 70B model on your specific task
4. **Lower latency** — Smaller fine-tuned models respond faster

> [!IMPORTANT]
> **Best approach for RepoTalk:** Fine-tune `Qwen2.5-Coder-7B` or `Llama-3.1-8B` using **QLoRA** (4-bit quantized LoRA). This requires only ~8 GB VRAM and takes 1–3 hours on a single GPU.

---

### Step 6 — Collect Training Data

You need ~200–500 high-quality examples in the format your model should output. The best source: **your own RepoTalk usage logs**.

Create a training data collection script:

```python
# ai_service/scripts/collect_training_data.py
"""
Collects Q&A pairs from RepoTalk usage for fine-tuning.
Each example is: system_prompt + context + question → ideal_answer
"""

import json
from pathlib import Path

TRAINING_DATA_DIR = Path("ai_service/training_data")
TRAINING_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Format: list of {"messages": [system, user, assistant]}
def create_training_example(
    question: str,
    context_chunks: list[dict],
    ideal_answer: str,
) -> dict:
    """Create one training example in ChatML format."""
    from app.core.prompt_builder import SYSTEM_PROMPT, format_context_block
    
    context_block = format_context_block(context_chunks)
    user_message = f"{context_block}\n\nQuestion: {question}"
    
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": ideal_answer},
        ]
    }


def save_dataset(examples: list[dict], filename: str = "train.jsonl"):
    """Save training examples in JSONL format (one JSON per line)."""
    output_path = TRAINING_DATA_DIR / filename
    with open(output_path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    print(f"Saved {len(examples)} examples to {output_path}")
```

**Three ways to collect training data:**

| Method | Effort | Quality |
|---|---|---|
| **Manual curation**: Use RepoTalk, save the best Q&A pairs | High | Best |
| **Synthetic generation**: Use Groq 70B to generate Q&A for your repos | Medium | Good |
| **Distillation**: Log all Groq responses, filter the high-quality ones | Low | Good |

> [!TIP]
> **Recommended: Synthetic + Distillation combo.** Use Groq to generate 500 Q&A pairs across different repos, then manually review ~50 of the worst ones to correct them. This gives you high quality with low effort.

---

### Step 7 — Choose Your Fine-Tuning Stack

Here's a comparison of the tools:

| Tool | Ease | GPU Needed | Best For |
|---|---|---|---|
| **Unsloth** | ⭐⭐⭐⭐⭐ | 1× GPU (8 GB+) | Local QLoRA. **Recommended for you.** |
| **TRL (HuggingFace)** | ⭐⭐⭐ | 1× GPU (16 GB+) | Flexible, full control |
| **OpenPipe** | ⭐⭐⭐⭐⭐ | Cloud (no GPU) | Managed service, costs $$ |
| **Axolotl** | ⭐⭐⭐⭐ | 1× GPU (8 GB+) | YAML-based, easy config |
| **Ollama Modelfile** | ⭐⭐⭐⭐⭐ | None | Prompt template only (not real fine-tuning) |

> [!IMPORTANT]
> **My recommendation:**
> - **If you have a GPU (RTX 3060+):** Use **Unsloth** for QLoRA fine-tuning. It's 2× faster than TRL, uses 60% less memory, and is free.
> - **If you have NO GPU:** Use **Google Colab** (free T4 GPU) with Unsloth. Or use **OpenPipe** (managed, ~$5 per fine-tune).
> - **TRL** is good if you need maximum control but is slower and more complex.

---

### Step 8 — Fine-Tune with Unsloth (Recommended)

#### 8a. Install Unsloth

```powershell
# Create a separate conda environment for fine-tuning
conda create -n repotalk-finetune python=3.11 -y
conda activate repotalk-finetune

# Install PyTorch with CUDA (adjust for your CUDA version)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install Unsloth
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps trl peft accelerate bitsandbytes
```

#### 8b. Fine-Tuning Script

Create `ai_service/scripts/finetune_unsloth.py`:

```python
"""
Fine-tune Qwen2.5-Coder-7B for RepoTalk using Unsloth (QLoRA).
Requires: 1× GPU with 8+ GB VRAM, ~2 hours for 500 examples.
"""

from unsloth import FastLanguageModel
import torch
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import load_dataset

# ────────────────────── 1. Load Base Model ──────────────────────
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-Coder-7B-Instruct",  # 4-bit quantized
    max_seq_length=4096,    # RepoTalk prompts can be long
    dtype=None,             # Auto-detect
    load_in_4bit=True,      # QLoRA: 4-bit quantization
)

# ────────────────────── 2. Add LoRA Adapters ──────────────────────
model = FastLanguageModel.get_peft_model(
    model,
    r=16,                   # LoRA rank (16 is good balance)
    target_modules=[        # Which layers to fine-tune
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",  # 30% less VRAM
)

# ────────────────────── 3. Load Training Data ──────────────────────
dataset = load_dataset("json", data_files="ai_service/training_data/train.jsonl", split="train")

def formatting_func(examples):
    """Convert our JSONL format to chat template."""
    texts = []
    for messages in examples["messages"]:
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        texts.append(text)
    return {"text": texts}

dataset = dataset.map(formatting_func, batched=True)

# ────────────────────── 4. Train ──────────────────────
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=4096,
    dataset_num_proc=2,
    packing=False,
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=5,
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=42,
        output_dir="ai_service/models/repotalk-coder-lora",
    ),
)

print("Starting training...")
trainer_stats = trainer.train()
print(f"Training complete! Loss: {trainer_stats.training_loss:.4f}")

# ────────────────────── 5. Save the LoRA Adapter ──────────────────────
model.save_pretrained("ai_service/models/repotalk-coder-lora")
tokenizer.save_pretrained("ai_service/models/repotalk-coder-lora")
print("LoRA adapter saved!")

# ────────────────────── 6. (Optional) Merge & Export to GGUF for Ollama ──────────────────────
# This creates a single file you can load directly in Ollama
model.save_pretrained_gguf(
    "ai_service/models/repotalk-coder-gguf",
    tokenizer,
    quantization_method="q4_k_m",  # Good quality/size balance
)
print("GGUF model exported! Ready for Ollama.")
```

#### 8c. Run Fine-Tuning

```powershell
conda activate repotalk-finetune
cd C:\dev\RepoTalk
python ai_service/scripts/finetune_unsloth.py
```

**Expected output:**
```
Loading model: Qwen2.5-Coder-7B-Instruct (4-bit)...
Adding LoRA adapters (rank=16)...
Starting training...
Step 10/375: loss=1.82
Step 20/375: loss=1.45
...
Step 375/375: loss=0.65
Training complete! Loss: 0.8234
LoRA adapter saved!
GGUF model exported! Ready for Ollama.
```

---

### Step 9 — Load Your Fine-Tuned Model in Ollama

After the GGUF export, create an Ollama Modelfile:

```powershell
# Create the Modelfile
cd C:\dev\RepoTalk\ai_service\models
```

Create `ai_service/models/Modelfile`:
```dockerfile
FROM ./repotalk-coder-gguf/unsloth.Q4_K_M.gguf

TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ .Response }}<|im_end|>
"""

PARAMETER temperature 0.2
PARAMETER num_ctx 4096
PARAMETER stop "<|im_end|>"

SYSTEM """You are RepoTalk, a careful assistant that explains a software repository..."""
```

Then register it with Ollama:

```powershell
cd C:\dev\RepoTalk\ai_service\models
ollama create repotalk-coder -f Modelfile

# Test it
ollama run repotalk-coder "What does a chunker do in a RAG pipeline?"
```

Finally, update your `.env`:

```env
OLLAMA_MODEL=repotalk-coder
```

---

### Step 10 — Alternative: Fine-Tune with TRL (If You Want More Control)

If you prefer HuggingFace TRL over Unsloth:

```powershell
pip install trl peft transformers datasets bitsandbytes accelerate
```

```python
# ai_service/scripts/finetune_trl.py
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTConfig, SFTTrainer
from datasets import load_dataset
import torch

# 1. Quantization config
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)

# 2. Load model
model_id = "Qwen/Qwen2.5-Coder-7B-Instruct"
model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb_config, device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = prepare_model_for_kbit_training(model)

# 3. LoRA config
peft_config = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, peft_config)

# 4. Load data
dataset = load_dataset("json", data_files="ai_service/training_data/train.jsonl", split="train")

# 5. Train
training_args = SFTConfig(
    output_dir="ai_service/models/repotalk-coder-trl",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    logging_steps=10,
    max_seq_length=4096,
)

trainer = SFTTrainer(
    model=model, tokenizer=tokenizer,
    train_dataset=dataset, args=training_args,
)
trainer.train()
model.save_pretrained("ai_service/models/repotalk-coder-trl")
```

> [!WARNING]
> TRL is ~2× slower than Unsloth and uses ~40% more VRAM for the same task. Use it only if you need features Unsloth doesn't support (e.g., DPO/RLHF training, custom loss functions).

---

### Step 11 — Alternative: OpenPipe (No GPU Needed)

If you don't have a GPU at all, [OpenPipe](https://openpipe.ai) is a managed fine-tuning service:

1. Export your training data as JSONL
2. Upload to OpenPipe dashboard
3. Select base model (Llama 3.1 8B or Qwen 2.5 7B)
4. Click "Train" → wait ~30 min
5. OpenPipe gives you an API endpoint (OpenAI-compatible)

**Cost:** ~$5 per fine-tune run. The hosted model inference is charged per-token.

To use it in RepoTalk, you'd update `llm_provider.py` to add OpenPipe as a third provider option.

---

## Summary: What To Do Right Now

### Quick Win (30 minutes):
```powershell
# 1. Install Ollama
# Download from https://ollama.com/download

# 2. Pull a good code model
ollama pull qwen2.5-coder:7b

# 3. Update .env
# OLLAMA_MODEL=qwen2.5-coder:7b

# 4. Test — your code already has automatic Groq → Ollama fallback!
```

### Full Fine-Tune (3-4 hours, requires GPU):
1. Collect 200-500 training examples from RepoTalk logs
2. Install Unsloth in a conda env
3. Run `finetune_unsloth.py`
4. Export to GGUF → Load in Ollama
5. Update `OLLAMA_MODEL=repotalk-coder`

### Decision Tree

```
Do you have a GPU (RTX 3060+ / 8GB VRAM)?
├── YES → Use Unsloth for local QLoRA fine-tuning
│         Best model: Qwen2.5-Coder-7B
│         Time: ~2 hours
│         Cost: Free
│
├── NO, but have Google account → Use Google Colab (free T4)
│         Same Unsloth script, runs in browser
│         Time: ~3 hours
│         Cost: Free
│
└── NO GPU at all → Two options:
    ├── Use Ollama with stock model (no fine-tuning)
    │   Good enough for most cases
    │   Cost: Free
    │
    └── Use OpenPipe managed service
        Best quality, no GPU needed
        Cost: ~$5 per training run
```
