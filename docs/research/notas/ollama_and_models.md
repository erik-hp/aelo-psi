# Ollama context limits and the frontier-model claims made by Gemini

Checked on 2026-11-06. Ollama source links point to `main` at commit `6362e0a3` (2026-11-06). The latest release was [v0.40.15, published 2026-11-03](https://github.com/ollama/ollama/releases/tag/v0.40.15). No Ollama daemon was available on this machine (`ollama: command not found`), so every Ollama behaviour below comes from source, docs, and issue reports. None of it was run here.

Pages that could not be reached: `openai.com/index/introducing-gpt-5-5/` returned HTTP 403. `runner/ollamarunner/runner.go` and `runner/llamarunner/runner.go` no longer exist on `main` (404); that logic now lives in `llm/llama_server.go`.

## How does Ollama set the default context today, and how has that changed?

### Takeaway
Ollama has no single default. Since v0.15.5, when nothing is set, `num_ctx` depends on total VRAM: 4,096 below about 24 GiB, 32,768 at 24-48 GiB, and 262,144 at 48 GiB or more. The result is then clamped to the model's own maximum.

### Cited Findings
- Version history, read from tagged source:
  - v0.1.0 hard-coded [`NumCtx: 2048`](https://github.com/ollama/ollama/blob/v0.1.0/api/types.go).
  - By v0.5.13 the default was [`OLLAMA_CONTEXT_LENGTH`, default 2048](https://github.com/ollama/ollama/blob/v0.5.13/envconfig/config.go). I sampled tags and did not locate the first release containing the variable.
  - v0.6.7 (2025-04-26): ["Increased default context window to 4096 tokens"](https://github.com/ollama/ollama/releases/tag/v0.6.7).
  - v0.15.5 (2026-02-03): [VRAM-based defaults of 4,096 / 32,768 / 262,144](https://github.com/ollama/ollama/releases/tag/v0.15.5). The env default became [`0`, meaning automatic](https://github.com/ollama/ollama/blob/v0.15.5/envconfig/config.go).
- Current thresholds in code are slightly lower than the documented ones: [`>= 47 GiB` gives 262144, `>= 23 GiB` gives 32768, otherwise 4096](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/routes.go#L2578-L2586). The code comment says the lower values absorb small differences in the reported amount. VRAM is summed across GPUs, minus `OLLAMA_GPU_OVERHEAD`.
- Official docs give the tiers as [< 24 GiB: 4k, 24-48 GiB: 32k, >= 48 GiB: 256k](https://docs.ollama.com/context-length). The same page recommends at least 64,000 tokens for agents, web search, and coding tools, per the [search extract of that page](https://docs.ollama.com/context-length).
- Doc conflict: the [FAQ still says](https://docs.ollama.com/faq) "By default, Ollama uses a context window size of 4096 tokens." That is only the lowest tier. The context-length page and source take precedence.
- Automatic mode applies only when [`options.num_ctx`, the model's Modelfile `num_ctx`, and `OLLAMA_CONTEXT_LENGTH` are all absent](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/routes.go#L202-L212). In automatic mode only, Ollama [lowers the context after a load out-of-memory failure](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/sched.go#L804-L829).
- A requested context above the model's training maximum is [clamped to the model's limit](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/sched.go#L204-L209). `llm/server.go` [logs "requested context size too large for model"](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/llm/server.go).
- `ollama ps` [shows the allocated context in a `CONTEXT` column and GPU/CPU placement under `PROCESSOR`](https://docs.ollama.com/context-length).
- Parallel slots multiply the allocation: [`-c NumCtx * numParallel`](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/llm/llama_server.go#L402), and the [FAQ says RAM scales with both](https://docs.ollama.com/faq).

### Inferences
- Claims that "Ollama defaults to 2048" are out of date by more than 18 months.
- A machine with no GPU has zero summed VRAM, so it gets 4,096. This follows from the `switch` above and was not run.

### Gaps
- The first release containing `OLLAMA_CONTEXT_LENGTH` was not pinned down. It was absent at v0.1.0 and present at v0.5.13.

## What happens when a prompt exceeds num_ctx on /api/generate and /api/chat?

### Takeaway
By default Ollama returns HTTP 200 with no error and no truncation field, and it discards the start of the prompt. On `/api/generate` it keeps only the first few tokens plus the tail, cutting the prompt to about half of `num_ctx`, not to the full window. The only client-side signal is a lower `prompt_eval_count`.

### Cited Findings
- **`/api/generate` code path.** When the tokenized prompt is longer than `num_ctx - 1`, [`completionPromptForRequest`](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/llm/llama_server.go#L309-L346) keeps `tokens[:nKeep]`, removes the middle, keeps the tail, and logs `slog.Warn("truncating input prompt", ...)`.
- **The target length is about half the window.** The limit is [`numCtx - max((numCtx-numKeep)/2, 1)`](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/llm/llama_server.go#L348-L358). The code comment says this matches the old runners' first context shift. Default [`NumKeep` is 4](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/api/types.go#L1226), plus 1 when the tokenizer adds BOS.
- **Real log at the default size.** [Issue #17272](https://github.com/ollama/ollama/issues/17272) shows `msg="truncating input prompt" limit=2051 prompt=5143 keep=5 new=2051`. So a 5,143-token prompt was reduced to 2,051.
- **Maintainer reproduction.** In [#17427](https://github.com/ollama/ollama/issues/17427), collaborator rick-github shows that on a 65,536 buffer, 65,530 tokens are used whole, while a slightly longer prompt reports `prompt eval count: 32770`. He writes that "only enough tokens to fill half of the buffer are used, the rest are discarded." That issue is closed as `completed`, and the half-window behaviour is still in current code.
- **`/api/chat` has two stages.** First [`chatPrompt`](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/prompt.go#L21-L80) drops the oldest messages until the rest fits. System messages are preserved at this stage and the last message is always kept. It emits only a `slog.Debug` line. The rendered text then passes through the same token-level truncation when it is still too long.
- **The system prompt can still be lost.** rick-github [corrected himself in #17427](https://github.com/ollama/ollama/issues/17427): the final `[S U3]` is concatenated, tokenized, and truncated, "possibly resulting in all or the leading part of S being lost." [#8531](https://github.com/ollama/ollama/issues/8531) reported the same loss earlier and is closed.
- **No client-facing flag.** The [response types](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/api/types.go#L544-L570) contain `done_reason`, `prompt_eval_count`, and `prompt_eval_cached_count`, but no truncation field. The #17427 report, as summarized by search, says `done_reason` was `"stop"` in truncated responses. [#8099](https://github.com/ollama/ollama/issues/8099) records the warning as visible only in server logs.
- **The docs are silent.** The [`/api/generate` reference](https://docs.ollama.com/api/generate) does not mention `truncate`, `shift`, or overflow behaviour. It defines `prompt_eval_count` as "Number of input tokens in the prompt", which is misleading after truncation. My fetch of the [FAQ](https://docs.ollama.com/faq) found no truncation text, although a commenter in #17427 quotes the FAQ as describing "trimming to fit." I could not reconcile this, and the source shows trimming goes further than "fit."
- **Fail-closed controls exist in the API struct.** [`GenerateRequest` and `ChatRequest` both have top-level `truncate` and `shift` booleans](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/api/types.go#L114-L120). With `shift` false, the overflow branch [returns HTTP 400 with "the prompt is longer than the context length currently available to the model..."](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/llm/llama_server.go#L325-L327) rather than truncating.
- **Early cut-offs.** [#17272](https://github.com/ollama/ollama/issues/17272) reports responses ending abruptly while appearing complete, alongside a truncation log. It is closed; I did not read its resolution.
- **Issue number correction.** A third-party blog in my search results attributes silent truncation to Ollama issue #11409. That is wrong: [#11409 is a feature request titled "Add force num_ctx option"](https://github.com/ollama/ollama/issues/11409) and does not discuss truncation.

### Inferences
- With the default 4,096 window, a prompt of 4,095 tokens or fewer stays whole. A prompt of 4,096 or more shrinks to about 2,051. Going over by a small amount therefore loses roughly half the window. This is calculated from the formula and matches the logged `limit=2051`.
- `prompt_eval_count` can detect truncation, but only indirectly:
  - **Fingerprint check:** compare it with `num_ctx - (num_ctx - keep)//2`. It should be about 2,051 at `num_ctx` 4096.
  - **Client-side count:** compare it with your own token estimate of the prompt. I found no public tokenize route in [the route table](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/routes.go#L2405-L2449), so this estimate has to come from elsewhere.
  - `prompt_eval_cached_count` is reported separately, and `--verbose` output subtracts it from the total, so the total appears to include cached tokens. Confirm this in a test.
- For the fail-closed contract required by `AGENTS.md`, the strongest option found is to send `"shift": false` and also check `prompt_eval_count`. This comes from code reading only and must be tested. A change in `shift` can [force the runner to reload](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/sched.go#L1448-L1452), so all calls should send the same value.
- `shift: false` may also stop generation at the context limit rather than shifting. Check the behaviour for long outputs.

### Gaps
- The behaviour of `truncate: false` on `/api/generate` was not determined. It skips Ollama's truncation and defers to llama-server, whose response I did not trace.
- The `/v1` OpenAI-compatible behaviour was not tested. Third-party reports say [`num_ctx` in a `/v1` request body is ignored](https://www.betterclaw.io/blog/ollama-context-window-truncates-agent-config); treat that as unconfirmed.

## Does /api/embed `truncate` differ?

### Takeaway
Yes. `/api/embed` keeps the start of the input where `/api/generate` keeps the end, and it supports a clean error mode. The repo's `truncate: False` is the correct fail-closed choice.

### Cited Findings
- Docs: [default `true`; "If true, truncate inputs that exceed the context window. If false, returns an error."](https://docs.ollama.com/api/embed)
- Truncation [keeps `tokens[:ctxLen]`, the head](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/routes.go#L1255-L1276). The limit is the smaller of the model's context length and `num_ctx` ([lines 1241-1250](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/routes.go#L1241-L1252)).
- With `truncate: false`, the server returns [HTTP 400 "the input length exceeds the context length"](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/routes.go#L1284-L1298). A runner 413 is [returned unchanged rather than retried](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/server/routes.go#L1311-L1320).
- The embedding runner's batch size is [`min(NumBatch, NumCtx * numParallel)`](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/llm/llama_server.go#L601-L610), and [default `NumBatch` is 512](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/api/types.go#L1240).
- The response [includes `prompt_eval_count`](https://docs.ollama.com/api/embed), the number of input tokens processed.

### Inferences
- Inputs between 513 and 2,048 tokens may produce a 413 with `truncate: false`, because the batch limit may be lower than the context limit. This is a hypothesis from the code and needs a test with a roughly 1,000-token note. Passing `options.num_batch: 2048` is the likely fix.

### Gaps
- Automatic batch sizing is written for generation; I did not confirm that the 512 value applies to embedding runners in practice.

## What is the effective context for this repo's calls, and what are the models' real maximums?

### Takeaway
`llama3.1` is a valid tag and its model maximum is 131,072 tokens, but the repo never asks for that. On a machine below about 23 GiB of VRAM, or with no GPU, the effective context is 4,096 tokens. Prompts above that keep only about 2,051 tokens, and the repo's instructions sit in the part that gets deleted.

### Cited Findings
- **Repo calls.** `Backend/ai_service/main.py` lines 170, 200, and 213 send `{model, prompt, stream: False, format: "json"}` with no `options`. Line 87 sends `/api/embed` with `truncate: False`. `Backend/docker-compose.yml` lines 56-59 define `image: ollama/ollama:latest` with no `OLLAMA_CONTEXT_LENGTH` and no GPU configuration. No file in the repo sets `num_ctx`. Line numbers reflect the working tree during this research, in which `main.py` had uncommitted changes on `feat/recuperacao-camadas-lod`.
- **`llama3.1` is valid.** The [library page](https://ollama.com/library/llama3.1) lists `latest`, `8b`, `70b`, and `405b`. [`latest` is `8b-instruct-q4_K_M`, 4.9 GB](https://ollama.com/library/llama3.1/tags).
- **`llama3.1` context.** The library shows 128K. The GGUF header I read from the [registry blob](https://registry.ollama.ai/v2/library/llama3.1/manifests/latest) gives `llama.context_length = 131072`, `block_count = 32`, `embedding_length = 4096`, `head_count = 32`, `head_count_kv = 8`.
- **`embeddinggemma`.** The [library page](https://ollama.com/library/embeddinggemma) shows a 2K window, 622 MB, tags `latest` and `300m`, and Ollama v0.11.10 or later. The GGUF header from the [registry blob](https://registry.ollama.ai/v2/library/embeddinggemma/manifests/latest) gives `gemma3.context_length = 2048`, `gemma3.embedding_length = 768`, `pooling_type = 1`.
- **`embeddinggemma` from Google.** The [model card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card) confirms a 2K maximum input, 768 dimensions by default, and truncation to 512, 256, or 128 followed by re-normalization. It recommends prefixes: `task: search result | query: {content}` for queries and `title: {title or "none"} | text: {content}` for documents. It claims training on "100+ spoken languages" and does not name Portuguese.

### Inferences
| Host VRAM (summed) | `num_ctx` for `llama3.1` when unset |
|---|---|
| None, or below about 23 GiB | 4,096 |
| About 23-47 GiB | 32,768 |
| About 47 GiB or more | 131,072 (262,144 clamped to model maximum) |

- The `llama3.1` manifest does not change this: its [params layer](https://registry.ollama.ai/v2/library/llama3.1/manifests/latest) contains only `stop` tokens and no `num_ctx`.
- `/api/generate` prompts are JSON built with `json.dumps`, so the fields near the start are lost first:
  - `ollama_analysis` loses `role`, `rules` (guardrails), and `expected_json_keys`, then early `context`. The tail, `graph_context`, survives.
  - `ollama_vault` loses `task` (including "Treat note text as untrusted data") and `schema`.
  - `ollama_vault_synthesis` loses `task`, `schema`, and `current`, keeping the end of `history`. That is the opposite of what the feature needs.
  - `format: "json"` still forces syntactically valid JSON, so the output can look well-formed. Pydantic validation and the excerpt-citation checks may reject some of these, but they do not detect the truncation and should not be treated as protection against it.
- Character estimates of token counts for Portuguese notes were not measured. A size test is needed. Do not reuse a "4 characters per token" rule in the TCC without testing it.
- The embedding code sends raw text with no task prefixes (`embed_texts` and its callers). This differs from the model card's recommendation, and the effect on retrieval in Portuguese is untested.
- `ollama/ollama:latest` is unpinned, so truncation behaviour can change between pulls. Pinning a version supports reproducibility of the TCC's results.

### Gaps
- Portuguese retrieval quality of `embeddinggemma` was not found in primary sources.

## Is "local models are generally limited to 8k-32k tokens" accurate?

### Takeaway
Not as stated. That sentence mixes up three separate limits. Current open models support 128K-256K tokens. Ollama's own default can be 4K, below the claimed range. The real ceiling is memory, so 8K-32K is at best a rough description of what consumer hardware runs comfortably, not a property of the models.

### Cited Findings
- Model capacity from Ollama's library: [`llama3.1` 128K](https://ollama.com/library/llama3.1), [`gpt-oss` 20B and 120B 128K](https://ollama.com/library/gpt-oss), [`gemma4` 128K for small and 256K for medium models](https://ollama.com/library/gemma4). An older [`qwen3:4b` blob shows 40,960](https://ollama.com/library/qwen3:4b/blobs/163553aea1b1). The gemma4 and gpt-oss figures come from search extracts of those pages.
- Runtime default: [4K, 32K, or 256K depending on VRAM](https://docs.ollama.com/context-length).
- Real hardware example: [`gpt-oss:20b` at 65,536 context showing 13 GB, 100% GPU, in a maintainer's `ollama ps`](https://github.com/ollama/ollama/issues/17427). The reporter in the same issue used a 16 GB VRAM GPU at 65,536.
- Memory formula: Ollama's [estimator](https://github.com/ollama/ollama/blob/6362e0a30887bdd4f69e07a94e8a513383576204/llm/llama_server.go#L2854-L2869) is `weights + 2 * layers * kv_heads * head_dim * context * 2 bytes`, and a code comment calls it "intentionally conservative."
- Reductions: [`OLLAMA_KV_CACHE_TYPE=q8_0` uses about half of `f16` with very little quality loss, and `q4_0` about a quarter with more loss, when Flash Attention is on](https://docs.ollama.com/faq).

### Inferences
For `llama3.1:8b`, inserting the GGUF values gives `2 * 32 * 8 * 128 * 2 = 131,072` bytes, or 128 KiB of KV cache per context token. Adding 4.9 GB of weights (figures in decimal GB, using the `f16` default):

| `num_ctx` | KV cache | Approx. total with weights |
|---|---|---|
| 4,096 | 0.54 GB | 5.4 GB |
| 8,192 | 1.07 GB | 6.0 GB |
| 32,768 | 4.3 GB | 9.2 GB |
| 131,072 | 17.2 GB | 22.1 GB |

- Rule of thumb for this model: about 1.3 GB per 10,000 tokens of context, on top of the weights, multiplied by `OLLAMA_NUM_PARALLEL`. Compute buffers are extra. The figure varies by model, so recompute it from each GGUF.
- Bigger is not free. A CPU-offloaded model becomes much slower, and the repo has a 45-second HTTP timeout, so raising `num_ctx` must be tested together with latency. That is my inference; I did not measure it.
- A corrected version of the claim: "Current open models offer 128K-256K tokens. Usable context on a local machine is limited by memory, and Ollama may default to 4K unless configured."

### Gaps
- No primary source states a typical consumer range. Any "8K-32K" figure is a practical estimate, not a documented limit.

## Do Gemini 3.1 Pro and GPT-5.5 exist, and do they have 1M-token windows?

### Takeaway
Both exist and both have windows of about 1M tokens, so Gemini's claim holds on that point. Two qualifications matter: Gemini 3.1 Pro is still a preview model, and neither is the newest model from its vendor as of November 2026.

### Cited Findings
**Gemini 3.1 Pro**
- Model ID `gemini-3.1-pro-preview`: [input limit 1,048,576, output limit 65,536, labelled Preview](https://aistudio.google.com/docs/models/gemini-3.1-pro-preview). Google's [Cloud docs](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-pro) give the same limits, per a search extract.
- `ai.google.dev` documentation pages now redirect with a 301 to `aistudio.google.com/docs/...`.
- [Deprecations page](https://aistudio.google.com/docs/deprecations): still Preview, no shutdown date announced, and it is the replacement for `gemini-3-pro-preview`.
- [Pricing, standard tier, per 1M tokens](https://aistudio.google.com/docs/pricing): input $2.00 up to 200k and $4.00 above; output $12.00 and $18.00. Prompts over 200k are charged the higher rate for the whole request. No free tier. Batch and Flex cost half. Only the invite-only Contributor tier uses content to improve Google's products, according to my fetch of that page.
- The [current models page](https://aistudio.google.com/docs/models) lists `gemini-4-argon` with 1M context, plus the Gemini 3.x Flash line. `gemini-3.1-pro-preview` appears only in an endpoint table there.

**GPT-5.5**
- [`gpt-5.5` model page](https://developers.openai.com/api/docs/models/gpt-5.5): 1,050,000 context window, 128,000 max output, $5 input, $0.50 cached, $30 output per 1M tokens. Prompts over 272K input tokens cost 2x input and 1.5x output for the full session. Knowledge cutoff Dec 1, 2025. Snapshot `gpt-5.5-2026-04-23`.
- The [models overview](https://developers.openai.com/api/docs/models) now leads with GPT-6 Astra, GPT-6.1 Sol, GPT-6.1 Terra, and GPT-6 Luna, each at 1.05M context and 128K output. `gpt-5.5` is not in the part of that page I could read, although its own page still calls it a flagship.
- [Deprecations](https://developers.openai.com/api/docs/deprecations): plain `gpt-5.5` has no shutdown entry. `gpt-5.5-cyber-preview` is removed on Feb 1, 2027. `gpt-5` and its variants shut down Dec 11, 2026.

### Inferences
- A rounded "1M tokens" is acceptable for both, but cite the exact numbers. They are measured differently: Google separates input and output limits, while OpenAI gives one context window plus a max output.
- Example at 900K input tokens, excluding output, by calculation from the prices above: Gemini 3.1 Pro $3.60 per request, GPT-5.5 $9.00 per request.
- Sending clinical notes to either provider is a different data-governance decision from local Ollama, whatever the window size. The vendor's pricing-tier data terms do not settle LGPD or CFP questions, which need separate review.

### Gaps
- OpenAI's launch post returned 403. The April 23, 2026 launch date rests on the snapshot name and on third-party sites such as [LLM Reference](https://www.llmreference.com/model/gpt-5.5/openai-api).
- Third-party claims I could not confirm from OpenAI: [a roughly 400K window in Codex](https://dev.to/hassann/how-to-use-the-gpt-55-api-55kd), and that reasoning tokens consume the context window.
- Whether GPT-5.5's 128K output is carved out of the 1.05M window (leaving about 922K input) was not confirmed on the page.
- The exact wording of Gemini's statements in the student conversation was not provided to me, so this assesses only the claims named in the assignment.

## Does a bigger window remove the need for retrieval?

### Takeaway
No. Published evidence shows that accuracy falls as input grows, even inside the advertised limit, and focused context beats full context. I found no independent test of Gemini 3.1 Pro or GPT-5.5 near 1M tokens.

### Cited Findings
- [Chroma, "Context Rot"](https://www.trychroma.com/research/context-rot): 18 models from four providers. "Across all experiments, model performance consistently degrades with increasing input length." Lower needle-question similarity made degradation faster, and even one distractor lowered accuracy.
- Same report, closest to the clinical case: on LongMemEval, full prompts of about 113k tokens did worse than focused prompts of about 300 tokens across all model families. Claude models had the largest gap, mainly from abstentions. It also found "structural coherence consistently hurts model performance", and shuffled haystacks did better than ordered ones. GPT models hallucinated most under distractors.
- Bias note: Chroma sells a retrieval database, so it has an interest in this conclusion. The July 2025 date comes from [secondary coverage](https://particula.tech/blog/chroma-context-rot-long-context-degradation), and the models tested are now old.
- [Bianchi et al., arXiv 2505.18148](https://arxiv.org/abs/2505.18148): more than 150,000 experiments on 11 LLMs, including a biomedical reasoning benchmark. Shorter gold contexts lower performance and increase sensitivity to position. Gold-context size remains an independent predictor after controlling for position and distractors. This matters for small facts inside long records.
- [Ebrahimzadeh & Salili, arXiv 2601.02023](https://arxiv.org/abs/2601.02023): tests Gemini 2.5 Flash, GPT-5 mini, Claude 4.5 Haiku, and DeepSeek v3.2. It reports "Distributional Collapse" when evidence is dispersed. It also reports a "Safety Tax": prompts discouraging fabrication made models refuse facts that were present. Many failures reflect poor context use, not the window size.
- [LangChain multi-needle benchmark, March 2024](https://www.langchain.com/blog/multi-needle-in-a-haystack): performance falls as more facts must be retrieved and reasoned over. Details come from a search extract; the page was not opened.

### Inferences
- Longitudinal clinical records match the hard conditions in these studies: facts spread across sessions, small evidence units, and many similar distractors. This is an argument by analogy. None of these studies used clinical records in Portuguese.
- Retrieval has other jobs a large window does not do: enforcing per-patient scope, keeping provenance for citations, and limiting how much sensitive text is sent. These follow from the project's invariants in `AGENTS.md`, not from the studies.
- The defensible position for the TCC: a large window changes the budget for retrieved context, not the need to select it. Retrieval and window size should be tested together, not treated as alternatives.

### Gaps
- No primary benchmark at a full 1M tokens was found. A [2026 secondary claim that Chroma tested 1K-1M tokens](https://particula.tech/blog/chroma-context-rot-long-context-degradation) could not be confirmed on Chroma's own page, which reports eight lengths up to each model's maximum without listing them.
- Secondary sources disagree on whether degradation is gradual or a threshold drop. Do not state either in the TCC without checking Chroma's plots.
- No study of Gemini 3.1 Pro, GPT-5.5, or `llama3.1` on Portuguese clinical longitudinal text was found.
