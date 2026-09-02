#!/usr/bin/env python3
"""Generate explicit V5 metadata for every canonical glossary entry.

The output remains an explicit per-term sidecar. Source families below are deliberately
small and reviewed: primary papers/specifications/standards/official documentation are
preferred; existing per-term metadata is treated as a manual override and preserved.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
ALLOWED_LEVELS = {"Beginner", "Core", "Advanced"}
NUMERIC_SHARD = re.compile(r"^glossary-\d+\.json$")

REF = {
    "deep_learning": {"title": "Deep Learning", "url": "https://www.deeplearningbook.org/"},
    "google_ml": {"title": "Google Machine Learning Glossary", "url": "https://developers.google.com/machine-learning/glossary"},
    "transformer": {"title": "Attention Is All You Need", "url": "https://arxiv.org/abs/1706.03762"},
    "gpt3": {"title": "Language Models are Few-Shot Learners", "url": "https://arxiv.org/abs/2005.14165"},
    "rag": {"title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", "url": "https://arxiv.org/abs/2005.11401"},
    "agents": {"title": "Building Effective AI Agents", "url": "https://www.anthropic.com/engineering/building-effective-agents"},
    "mcp": {"title": "The 2026-07-28 Model Context Protocol Specification", "url": "https://blog.modelcontextprotocol.io/posts/2026-07-28/"},
    "openapi": {"title": "OpenAPI Specification", "url": "https://spec.openapis.org/oas/latest.html"},
    "json_schema": {"title": "JSON Schema Specification", "url": "https://json-schema.org/specification"},
    "nist_ai": {"title": "NIST AI Risk Management Framework 1.0", "url": "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10"},
    "least_privilege": {"title": "NIST Glossary: Least Privilege", "url": "https://csrc.nist.gov/glossary/term/least_privilege"},
    "owasp_prompt": {"title": "OWASP LLM01: Prompt Injection", "url": "https://genai.owasp.org/llmrisk/llm01-prompt-injection/"},
    "openai_evals": {"title": "OpenAI Evals", "url": "https://evals.openai.com/"},
    "openai_chatgpt": {"title": "What is ChatGPT: FAQ", "url": "https://help.openai.com/en/articles/12677804-what-is-chatgpt-faq"},
    "sre": {"title": "Site Reliability Engineering", "url": "https://sre.google/sre-book/table-of-contents/"},
    "swebok": {"title": "Guide to the Software Engineering Body of Knowledge (SWEBOK Guide V4.0)", "url": "https://www.computer.org/education/bodies-of-knowledge/software-engineering"},
    "world_models": {"title": "World Models", "url": "https://arxiv.org/abs/1803.10122"},
    "universal_intelligence": {"title": "Universal Intelligence: A Definition of Machine Intelligence", "url": "https://arxiv.org/abs/0712.3329"},
    "superintelligence": {"title": "How Long Before Superintelligence?", "url": "https://nickbostrom.com/superintelligence"},
    "singularity": {"title": "The Coming Technological Singularity", "url": "https://cseweb.ucsd.edu/~goguen/misc/singularity.html"},
    "physical_ai": {"title": "Aligning Perception, Reasoning, Modeling and Interaction: A Survey on Physical AI", "url": "https://pubmed.ncbi.nlm.nih.gov/42284175/"},
    "llama_cpp": {"title": "llama.cpp — LLM inference in C/C++", "url": "https://github.com/ggml-org/llama.cpp"},
    "safetensors": {"title": "Safetensors documentation", "url": "https://huggingface.co/docs/safetensors/index"},
    "hf_cache": {"title": "Hugging Face Transformers: Cache strategies", "url": "https://huggingface.co/docs/transformers/main/kv_cache"},
    "hf_generation": {"title": "Hugging Face Transformers: Generation", "url": "https://huggingface.co/docs/transformers/en/main_classes/text_generation"},
    "cuda": {"title": "CUDA Programming Guide", "url": "https://docs.nvidia.com/cuda/cuda-programming-guide/index.html"},
    "metal": {"title": "Metal Overview", "url": "https://developer.apple.com/metal/"},
    "lm_studio": {"title": "LM Studio Documentation", "url": "https://lmstudio.ai/docs/app"},
    "ollama": {"title": "Ollama Documentation", "url": "https://docs.ollama.com/"},
    "vibe": {"title": "Andrej Karpathy's original description of vibe coding (archived by Simon Willison)", "url": "https://simonwillison.net/2025/Feb/6/andrej-karpathy/"},
    "distillation": {"title": "Distilling the Knowledge in a Neural Network", "url": "https://arxiv.org/abs/1503.02531"},
    "pruning": {"title": "Learning both Weights and Connections for Efficient Neural Networks", "url": "https://arxiv.org/abs/1506.02626"},
    "quantization": {"title": "Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference", "url": "https://arxiv.org/abs/1712.05877"},
}


ADVANCED_TERMS = {
    "Attention", "Backpropagation", "Gradient descent", "Softmax", "Vector", "RoPE",
    "KV cache", "Mixture of Experts (MoE)", "Memory bandwidth", "Quantization level",
    "Pass@k", "Chain of thought (CoT)", "World model", "Distillation", "Pruning", "Quantization",
}
BEGINNER_TERMS = {
    "AI", "Model", "LLM", "Agent", "Token", "Prompt", "Tool", "Workflow", "API", "ChatGPT",
    "AI assistant", "Inference", "Training", "Weights", "Cache", "Latency", "Throughput",
    "Black box", "White box", "Dogfood", "Vibe coding", "Plugin",
}


def glossary_files(root: Path) -> list[Path]:
    return sorted(path for path in root.iterdir() if path.is_file() and NUMERIC_SHARD.match(path.name))


def load_entries(root: Path) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for path in glossary_files(root):
        payload = json.loads(path.read_text(encoding="utf-8"))
        result.extend(item for item in payload.get("entries", []) if isinstance(item, dict))
    return result


def level_for(entry: dict[str, Any]) -> str:
    term = str(entry.get("term", ""))
    group = str(entry.get("group", ""))
    kind = str(entry.get("kind", ""))
    if term in ADVANCED_TERMS or "Mathematics" in group or kind in {"Algorithm", "Mechanism", "Architecture"}:
        return "Advanced"
    if term in BEGINNER_TERMS or kind == "Slang" or group == "Slang & Engineering":
        return "Beginner"
    return "Core"


def refs_for(entry: dict[str, Any]) -> list[dict[str, str]]:
    term = str(entry.get("term", ""))
    group = str(entry.get("group", ""))

    exact = {
        "ChatGPT": "openai_chatgpt",
        "AI assistant": "openai_chatgpt",
        "MCP": "mcp",
        "API": "openapi",
        "Agent-friendly API": "openapi",
        "Schema": "json_schema",
        "Prompt injection": "owasp_prompt",
        "Least privilege": "least_privilege",
        "RAG": "rag",
        "Retrieval": "rag",
        "Embedding": "google_ml",
        "Vector database": "rag",
        "World model": "world_models",
        "AGI": "universal_intelligence",
        "ASI": "superintelligence",
        "Singularity": "singularity",
        "Physical AI": "physical_ai",
        "Vibe coding": "vibe",
        "Distillation": "distillation",
        "Pruning": "pruning",
        "Quantization": "quantization",
        "Softmax": "google_ml",
        "Backpropagation": "google_ml",
        "Gradient descent": "google_ml",
        "Vector": "deep_learning",
        "Attention": "transformer",
        "RoPE": "transformer",
        "KV cache": "hf_cache",
        "Sampling": "hf_generation",
        "Temperature": "hf_generation",
        "Next-token prediction": "gpt3",
        "llama.cpp": "llama_cpp",
        "GGUF": "llama_cpp",
        "Safetensors": "safetensors",
        "CUDA": "cuda",
        "Metal": "metal",
        "Ollama": "ollama",
        "LM Studio": "lm_studio",
    }
    if term in exact:
        return [REF[exact[term]]]

    if group == "Agent Architecture" or term in {"Agentic AI", "Harness", "Subagent", "Multi-agent system", "Planner", "Executor", "Verifier", "Reflection", "Critic", "Handoff", "Autonomy", "Bounded autonomy"}:
        return [REF["agents"]]
    if group == "Control & Safety":
        return [REF["nist_ai"]]
    if group == "Evaluation":
        return [REF["openai_evals"]]
    if group == "Interfaces" or group == "Tools & Interfaces":
        return [REF["openapi"]]
    if group == "Execution" or group == "Efficiency":
        return [REF["sre"]]
    if group == "Slang & Engineering":
        return [REF["swebok"]]
    if group.startswith("Local LLM") or group in {"Models & Deployment", "Local LLM Formats", "Local LLM Memory", "Local LLM Performance", "Local LLM Runtime", "Local LLM Tools"}:
        if term in {"KV cache"}:
            return [REF["hf_cache"]]
        if term in {"CUDA", "VRAM", "System RAM", "Unified memory", "Memory bandwidth", "GPU offload", "CPU inference", "Batch size"}:
            return [REF["cuda"]]
        return [REF["llama_cpp"]]
    if group in {"Context & Memory"}:
        if term in {"RAG", "Retrieval", "Embedding", "Vector database"}:
            return [REF["rag"]]
        return [REF["gpt3"]]
    if group in {"Models & Architecture", "Models & Reasoning", "Model Behavior", "Model Optimization", "LLM Mathematics"}:
        if term in {"Attention", "RoPE", "Transformer"}:
            return [REF["transformer"]]
        return [REF["google_ml"]]
    if group in {"AI Futures"}:
        return [REF["universal_intelligence"]]
    if group == "Embodied AI":
        return [REF["physical_ai"]]
    if group in {"Core", "Products & Systems"}:
        return [REF["deep_learning"]]

    # Reviewed conservative fallback for generic software/engineering vocabulary.
    return [REF["swebok"]]


def build_metadata(root: Path, overrides: dict[str, Any]) -> dict[str, dict[str, Any]]:
    metadata: dict[str, dict[str, Any]] = {}
    for entry in load_entries(root):
        term = str(entry.get("term", "")).strip()
        if not term:
            continue
        if term in overrides:
            metadata[term] = overrides[term]
            continue
        metadata[term] = {"level": level_for(entry), "references": refs_for(entry)}
    return dict(sorted(metadata.items(), key=lambda item: item[0].casefold()))


def main() -> int:
    path = ROOT / "glossary-metadata.json"
    existing: dict[str, Any] = {}
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and isinstance(payload.get("entries"), dict):
            existing = payload["entries"]
    generated = build_metadata(ROOT, existing)
    path.write_text(json.dumps({"entries": generated}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated V5 metadata for {len(generated)} canonical terms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
