# Layered ("Level of Detail") Retrieval for Long Longitudinal Text Histories in RAG

Work date: November 2026. Context: per-patient psychotherapy notes in Portuguese, 50-200 notes per patient, PostgreSQL + pgvector, local LLM via Ollama.

Reading conventions used throughout:
- Every number carries source and dataset. None of these datasets is psychotherapy, and none but the flagged Portuguese items is in Portuguese. Any transfer to this project appears under Inferences and is flagged [EXTRAPOLATION].
- Evidence tags: [PDF] = I read the paper text extracted from the PDF. [HTML] = read through a page-to-text fetch, tables reconstructed by a summarizer, so check them against the original before quoting in the thesis. [ABSTRACT/SNIPPET] = search result or abstract only, full text not read. [VENDOR] = self-reported by a party with a commercial interest.
- Percent changes marked "my arithmetic" are mine, computed from the cited table values.

## Overall question: does a lightweight timeline index plus full text of only the relevant documents beat (a) recency windows, (b) pure vector search, (c) lossy summarization of old records?

### Takeaway
No head-to-head study of this exact architecture was found on clinical or psychotherapy data, so the claim is unproven as stated. Component evidence is: fairly strong that it beats a recency window for facts spread across the record (task-dependent, EHR data); strong that keeping and being able to read source text beats replacing it with summaries; and strongest of all that the index must not be the only search surface. Searching only on summaries or keywords lost 17-32% of session-level recall on LongMemEval even though full text was still what got returned. The defensible form of the hypothesis is therefore "index + search over source + full text", and it has to be tested in this project.

### Cited Findings

Against (a) recency windows:
- Inpatient EHR, 200 stays per task from one US hospital system, each stay at least 7 days and 15K tokens. RAG used top-20/40/60 chunks of 128 tokens, BGE-en-large-v1.5, and a hand-written query, compared with the most recent notes at about 3K/5.5K/8K tokens. Normalized area difference, RAG vs recent notes: imaging +364% to +552% depending on model and metric; antibiotic medications +39% to +43%; antibiotic timespan +30% to +35%; diagnosis generation about zero or negative on the primary target (-1.47% to -4.08%), and -4.99% to -7.31% against discharge-summary diagnoses — [Evaluating RAG vs Long-Context Input for Clinical Reasoning over EHRs, arXiv 2508.14817](https://arxiv.org/html/2508.14817v1) [HTML].
- The same paper: at 60 chunks (my arithmetic: at most about 7.7K tokens, against mean stays of 74K-108K) RAG came close to full context, 1.72-5.56 points below it on imaging and 2.14-4.75 points above it on medication-name F1 — [arXiv 2508.14817](https://arxiv.org/html/2508.14817v1) [HTML].

Against full history stuffed into context (the implicit fourth baseline):
- LongMemEvalS, oracle evidence vs full history, no chain-of-note: GPT-4o 0.870 to 0.606 (-30.3%), Llama 3.1 8B 0.710 to 0.454 (-36.1%), Llama 3.1 70B 0.744 to 0.334 (-55.1%), Phi-3 14B 0.702 to 0.380 (-45.9%) — [LongMemEval, Wu et al., ICLR 2025](https://arxiv.org/html/2410.10813v2) [HTML, Figure 3b values, column mapping reconstructed].
- MIMIC-based EHR QA with Qwen2.5-32B, LLM-correctness: EHRNoteQA full history 62.54 vs RAG top-15 chunks 73.45 vs RAG with parent-note inclusion top-7 72.00; EHR-DS-QA 50.27 vs 60.52 vs 55.13 — [Investigating LLM Capabilities on Long Context Comprehension for Medical QA, arXiv 2510.18691](https://arxiv.org/html/2510.18691v2) [HTML].

Closest published analogues to "index, then full text":
- TierMem: summary index by default, escalation to immutable raw logs when evidence is insufficient. LoCoMo accuracy: summary-only 0.755, raw-only 0.873, router 0.851, with input tokens down 54.1% (3,396 vs 7,398) and latency down 60.7% (6.76 s vs 17.18 s). LongMemEval overall: summary 0.678, raw 0.808, router 0.752 — [From Lossy to Verified, Zhu et al., arXiv 2602.17913](https://arxiv.org/pdf/2602.17913) [PDF; table layout partly garbled, overall accuracy columns read with care].
- Parent-note ("hierarchical") inclusion on EHR: the authors conclude it is best for multi-note EHRNoteQA and direct chunks best for single-note EHR-DS-QA, but the reconstructed Table 3 shows direct chunks numerically ahead on EHRNoteQA (73.45 vs 72.00). Check against the PDF before citing — [arXiv 2510.18691](https://arxiv.org/html/2510.18691v2) [HTML].

Against (c): see the section on recall loss below.

### Inferences
- [EXTRAPOLATION] The EHR recency result depends on task: recency loses badly for facts documented at a point in time (imaging, drug spans), and roughly ties when the latest notes carry forward the accumulated state (diagnoses). Psychotherapy notes may behave either way, so the evaluation should stratify by question type rather than report one average.
- [EXTRAPOLATION] Local models degrade more than GPT-4o under full history in LongMemEval, which argues for selective context under Ollama. The size match is an assumption: a 200-note record at an assumed 500 tokens per note is about 100K tokens, close to the roughly 115K-token LongMemEvalS variant ([repo summary](https://www.sourcepulse.org/projects/17561510)). Actual note length in this project was not measured.
- TierMem's trade-off shows the likely shape of the result: routing recovers most but not all of raw-only accuracy (0.851 vs 0.873 on LoCoMo; a wider gap, 0.752 vs 0.808, on LongMemEval). A router can fail silently, so an index-first design should be expected to cost some recall and that cost should be measured.

### Gaps
- No study found compares all four arms (recency, vector/hybrid, summary-only, index + full text) on one corpus.
- No published retrieval study found on longitudinal psychotherapy notes. One search surfaced note-generation work only, for example a [medRxiv preprint on psychotherapy note-making](https://www.medrxiv.org/content/10.1101/2025.06.25.25330252.full.pdf) reporting that models struggled with past-session and next-session details [ABSTRACT/SNIPPET]. A single search is not exhaustive.
- No evidence found for any specific index granularity (per-note, per-theme, timeline row) in clinical text.

## What do primary papers report about hybrid retrieval, parent-document retrieval, RAPTOR, GraphRAG/LightRAG and Contextual Retrieval?

### Takeaway
Hybrid retrieval is the best-supported and cheapest gain. RAPTOR's gains over its own baselines are small except for the headline QuALITY comparison, and it keeps the leaf text. GraphRAG's advantage rests largely on LLM-judged summarization, a protocol later shown to be order-sensitive, and it loses on detail retrieval while costing far more to index. Contextual Retrieval has good numbers, but they are unreplicated internal results.

### Cited Findings

Hybrid and fusion:
- Bruch et al. (ACM TOIS) table at cutoff 1000, test split; values are BM25 / semantic / TM2C2 convex (alpha=0.8) / RRF (eta=60). NDCG: MS MARCO .309/.441/.454/.425; Quora .800/.889/.901/.877; NQ .382/.505/.542/.514; FEVER .689/.558/.744/.721; HotpotQA .682/.520/.699/.675. Recall: MS MARCO .836/.964/.974/.969; NQ .886/.978/.985/.984; FEVER .969/.931/.972/.972; HotpotQA .878/.756/.884/.888 — [An Analysis of Fusion Functions for Hybrid Retrieval, arXiv 2210.11934](https://ar5iv.labs.arxiv.org/html/2210.11934) [HTML].
- Same paper: RRF is sensitive to its parameters, convex combination beats it in and out of domain, and alpha can be tuned with a small labeled sample (converges at roughly 5% of training data) — [abstract](https://www.pinecone.io/research/an-analysis-of-fusion-functions-for-hybrid-retrieval/md/); [full text](https://ar5iv.labs.arxiv.org/html/2210.11934).
- 3x3 factorial on LoCoMo, GPT-5-mini reader per the paper's stated bounds, k=5, 1,540 non-adversarial questions, LLM-judge accuracy. Cosine / BM25 / hybrid rerank: raw chunks 77.9 / 59.2 / 81.1; extracted facts 72.2 / 49.4 / 77.3; summarized episodes 70.1 / 62.7 / 73.3. Retrieval spread 14-23 points, write-strategy spread 3-8. Retrieval precision correlates r=0.98 with accuracy across the nine configurations — [Yuan et al., arXiv 2603.02473, header "ICLR 2026"](https://arxiv.org/pdf/2603.02473.pdf) [PDF; I did not confirm main track vs workshop].
- Longitudinal EHR hybrid setup: 512-token chunks, dense + BM25 with RRF, late-interaction reranking, retrieved chunks reordered temporally rather than by score — [arXiv 2510.18691](https://arxiv.org/html/2510.18691v2) [HTML].

Portuguese retrieval (mixed, corpus-dependent):
- European Portuguese, Ciberdúvidas: 600 paraphrase queries over 29,145 QA entries. A dense IR-tuned monolingual encoder reached MRR 0.93 and beat both BM25 and hybrid, which the authors attribute to "lexical mismatch interference" — [SLATE 2026](https://drops.dagstuhl.de/storage/01oasics/oasics-vol144-slate2026/OASIcs.SLATE.2026.1/OASIcs.SLATE.2026.1.pdf) [ABSTRACT/SNIPPET].
- Brazilian legal, JUÁ: BM25 very competitive on legislative collections, fine-tuned dense stronger on jurisprudence — [arXiv 2604.06098 summary](https://www.emergentmind.com/papers/2604.06098) [ABSTRACT/SNIPPET].
- Portuguese clinical text, single-author preprint: 500 queries across 6 specialties, dense-only "fails" on 22.2% of queries, kappa 0.954, deterministic citation verification 461/500 vs prompt-based 1/500 — [Zenodo preprint](https://zenodo.org/records/19686739) [abstract only; "failure" undefined on that page, and it does not report recall by method]. CAUTION: a [DEV post on the same study](https://dev.to/nomad-link-id/two-retrieval-methods-are-better-than-one-evidence-from-500-clinical-queries-4g41) gives discordant counts of 89 and 57, which do not appear consistent with a separately reported chi-square of 39.55. Not independently replicated. Do not treat as established.

Parent-document / small-to-big:
- I found no dedicated primary benchmark of the pattern itself. It appears in practitioner material and in the EHR parent-note variant above — [search result overview](https://arxiv.org/html/2603.06976) [ABSTRACT/SNIPPET].
- Chunk size is strongly dataset- and model-dependent: best R@5 ranged from 64 tokens to 1024 tokens across datasets; on TechQA, Snowflake R@1 rose from .0445 at 64 tokens to .7154 at 1024; on SQuAD (stitched documents), Stella R@1 fell from .6419 at 64 to .4979 at 512 — [Rethinking Chunk Size, arXiv 2505.21700](https://arxiv.org/html/2505.21700v2) [HTML; the fetch noted the paper's prose and tables disagree in places, and 3 of the 6 datasets are stitched synthetic documents].
- A 36-strategy chunking benchmark reports no universal winner — [arXiv 2603.06976](https://arxiv.org/html/2603.06976) [ABSTRACT/SNIPPET].

RAPTOR (Sarthi et al., ICLR 2024) [PDF]:
- QuALITY accuracy, UnifiedQA: SBERT 54.9 to 56.6 with RAPTOR; BM25 49.9 to 52.1; DPR 53.1 to 54.7. QASPER answer F1: SBERT 36.23 to 36.70, BM25 26.47 to 27.00, DPR 31.70 to 32.23. NarrativeQA ROUGE: SBERT 29.26 to 30.87, BM25 23.52 to 27.93, DPR 29.56 to 30.94 — [RAPTOR, arXiv 2401.18059](https://arxiv.org/pdf/2401.18059).
- Headline: RAPTOR + GPT-4 reaches 82.6 / 76.2 (test / hard) on QuALITY vs previous best CoLISA 62.3 / 54.7. This is a comparison across different systems and readers, not a controlled retriever swap. QASPER GPT-4 F1: RAPTOR 55.7, DPR 53.0, BM25 50.2 — [RAPTOR](https://arxiv.org/pdf/2401.18059).
- Collapsed-tree retrieval beat tree traversal on 20 QASPER stories, best at 2,000 tokens. It searches leaves and summaries together. Single-story layer test: all three layers 73.68 vs leaf-only 57.9 (Story 1 only). Wu et al.'s root-only recursive book summaries scored ROUGE-L 21.6 vs RAPTOR 30.8 on NarrativeQA — [RAPTOR](https://arxiv.org/pdf/2401.18059).
- Summaries: 72% compression, 4% (6 of 150) of nodes with minor hallucinations (gpt-3.5-turbo), reported as not propagating. Cost scales linearly in tokens and build time up to 80,000 tokens per document — [RAPTOR](https://arxiv.org/pdf/2401.18059). The authors call summarization "a lossy means of compression".

GraphRAG (Edge et al.; arXiv version reviewed includes the later claim-based evaluation) [PDF]:
- Podcast transcripts (about 1M tokens) and news (about 1.7M tokens). LLM head-to-head win rates of global search over vector RAG: comprehensiveness 72-83% and 72-80%; diversity 75-82% and 62-71%. Vector RAG was the most direct. Empowerment was mixed: specific examples, quotes and citations were judged key, and the authors say extraction prompts may need tuning to retain them. Indexing took 281 minutes for the Podcast set on gpt-4-turbo at 2M TPM, producing 8,564 nodes and 20,691 edges — [Edge et al., arXiv 2404.16130](https://arxiv.org/pdf/2404.16130).

LightRAG (Guo et al.) [PDF]:
- LLM-judged overall win rate vs GraphRAG on textbook-derived corpora: Agriculture 54.8%, CS 52.0%, Legal 52.8%, Mix 49.6%. Diversity is where the gap sits (59.2-77.2%, Mix 64.0%). Against NaiveRAG overall: 67.6 / 61.2 / 84.8 / 60.0% — [LightRAG, arXiv 2410.05779](https://arxiv.org/pdf/2410.05779).
- Authors' cost argument on Legal: GraphRAG retrieval about 610 x 1,000 tokens and hundreds of API calls vs under 100 tokens and one call; incremental update needs a rebuild of about 1,399 x 2 x 5,000 tokens. These are analytic estimates, not measured benchmarks — [LightRAG](https://arxiv.org/pdf/2410.05779).

Published criticism:
- MultiHop-RAG accuracy, Llama 3.1-8B / 70B: RAG 67.02/65.77; Community-GraphRAG Local 69.01/71.17; Global 64.40/65.69; KG triplets-only 41.24/50.98; HippoRAG2 70.27/69.87. By type, 8B, RAG vs Community Local: inference 92.16 vs 86.89; comparison 57.59 vs 60.63; null 96.01 vs 80.07; temporal 30.70 vs 50.60 — [Han et al., RAG vs. GraphRAG, arXiv 2502.11371](https://arxiv.org/html/2502.11371v2) [HTML].
- NovelQA 8B: overall RAG 57.12 vs Community Local 53.03; detail-oriented questions 55.28 vs 46.88. Ground-truth answer present in retrieved content: HotpotQA RAG .886 vs Community Local .6753 vs KG .392; NQ .867 / .422 / .3218. Only 65.8% and 65.5% of answer entities exist in the KG — [Han et al.](https://arxiv.org/html/2502.11371v2) [HTML].
- Swapping answer order in LLM-as-a-judge comparisons gave "completely opposite decisions" for RAG vs Community Local — [Han et al.](https://arxiv.org/html/2502.11371v2) [HTML; percentages are in figures, not extracted]. This undermines LLM-judged win rates, the basis of the GraphRAG, LightRAG and LazyGraphRAG comparisons.
- Construction time on MultiHop-RAG: RAG 135, KG 7,702, Community 5,560 (roughly 41x for Community, my arithmetic); ODSum-story: 74 / 6,496 / 2,828. Units were not stated in the extraction. Retrieved tokens on MultiHop-RAG: 3,631 vs 9,770 — [Han et al.](https://arxiv.org/html/2502.11371v2) [HTML].
- LazyGraphRAG: indexing "0.1% of the costs of full GraphRAG", 4% of the query cost of global search, on 5,590 AP articles, 100 synthetic queries, LLM-judged — [Microsoft Research blog](https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/) [VENDOR].

Anthropic Contextual Retrieval [VENDOR, primary]:
- Failure rate = 1 - recall@20, averaged across codebases, fiction, arXiv papers and science papers, Gemini Text 004 embeddings. Baseline 5.7%; contextual embeddings 3.7% (-35%); plus contextual BM25 2.9% (-49%); plus Cohere rerank (top 150 to 20) 1.9% (-67%). Absolute improvement 3.8 points at most. Cost $1.02 per million document tokens with Claude 3 Haiku and caching. Generic document summaries and summary-based indexing gave "limited" gains, with no numbers — [Anthropic Engineering](https://www.anthropic.com/engineering/contextual-retrieval).

### Inferences
- [EXTRAPOLATION] GraphRAG is a poor fit here: per-patient corpora are small, notes arrive continuously, entity extraction in Portuguese via a local LLM is an unmeasured cost, and the critical failure mode is missing a detail. KG retrieval dropping a third of answer entities on general corpora is a warning, not a measured psychotherapy result. One counter-signal is real: graph structure improved temporal questions on MultiHop-RAG (50.60 vs 30.70), and it should not be hidden.
- [EXTRAPOLATION] Contextual Retrieval's idea, prefixing each chunk with context, is the lightest index-like layer, and for notes much of the context is metadata (date, session number, note section) that needs no LLM call. Whether that captures the gain is untested. Its LLM-generated variant creates derived clinical text to encrypt and to rebuild on rectification.
- Hybrid should be treated as a hypothesis in Portuguese, not a default, given the Ciberdúvidas result. Paraphrase-heavy queries may suit dense retrieval, and a clinician's exact terms and names may suit lexical retrieval.

### Gaps
- Cormack et al. 2009 (the original RRF paper) was not read; RRF numbers here come from Bruch et al.
- Han et al.'s bias percentages and time units were not extracted. Read Figures 4/9 and Appendix M in the PDF before citing.
- No independent replication of Anthropic's figures was found, and Appendix per-domain and per-embedding results were not accessible.
- Microsoft's GraphRAG documentation home page contains no cost warning ([docs](https://microsoft.github.io/graphrag/)); other pages were not checked.

## What is the evidence on recall loss with summaries/keywords/tags only vs source text, and on lossy compression of old records? Clinical/EHR studies?

### Takeaway
This is the most consistent evidence in the set. Replacing or searching only derived text loses recall and accuracy, and compression errors are not visible at read time. Tag prefilters cost measurable recall on real ICU notes. The nuance is that additive derived keys can help (facts) or slightly hurt (summaries), and some readers answer better from structured observations even at lower recall, so derived text is useful as an addition, not as a replacement.

### Cited Findings
- LongMemEvalM (500 history sessions, about 1.5M tokens per question, Stella V5 embeddings). Key = what is searched, value = what is returned. Session value, R@5 / R@10: K=V .706/.783; K=summary .572/.648 (-19%/-17%, my arithmetic); K=keyphrase .482/.576 (-32%/-26%); K=fact .642/.814; K=V+summary .689/.749; K=V+keyphrase .710/.768; K=V+fact .732/.862 (+4%/+10%). Round value: K=V .582/.692; K=keyphrase .282/.392 (-52%/-43%); K=V+fact .644/.784 — [LongMemEval, ICLR 2025](https://arxiv.org/html/2410.10813v2) [HTML; column labels reconstructed from flattened text, and the K=summary GPT-4o Top-10 QA value of .252 looks anomalous; verify in the PDF].
- LoCoMo (GPT-3.5-turbo-16K), session summaries reached the highest retrieved-context recall (R@10 90.7) but overall F1 only 31.5, vs dialog top-25 35.8 and observations top-5 41.4. The authors attribute it to "loss of information during the conversion of dialogs to summaries" — [Maharana et al., ACL 2024](https://ar5iv.labs.arxiv.org/html/2402.17753) [HTML; one table cell reads 247.4, an impossible recall, so verify the table]. Note the contrary signal: observations (structured facts) gave the best F1 despite lower recall than dialog (71.1 vs 84.8 at k=50).
- LoCoMo factorial: raw chunks 81.1 vs summarized episodes 73.3 and extracted facts 77.3 under hybrid; retrieval failures 11.4% / 18.2% / 15.1% of questions. BM25 is the exception, summaries 62.7 vs raw 59.2, which the authors tentatively attribute to denser vocabulary — [Yuan et al.](https://arxiv.org/pdf/2603.02473.pdf) [PDF].
- TierMem, summary vs raw. LoCoMo temporal .717 vs .863, overall .755 vs .873. LongMemEval knowledge update .756 vs .846, temporal reasoning .519 vs .662, overall .678 vs .808. Unverifiable Omission Rate of its summary tier: 15.4% on LoCoMo, 19.6% on LongMemEval; competitors 14.7-29.6% — [Zhu et al.](https://arxiv.org/pdf/2602.17913) [PDF]. The paper's core argument is the "write-before-query barrier": compression decisions are made before the system knows what a query will hinge on.
- WhenLoss on LongMemEval (500 questions, three readers): with a fixed token budget, "write-side gaps exceed retrieval-side gaps for most tested baselines", 4 of 6 write-dominant; Summary (LLM) complete-memory score 0.44, its EPC method 0.49 — [Yu et al., arXiv 2605.24579](https://arxiv.org/abs/2605.24579) [ABSTRACT]. This conflicts in emphasis with Yuan et al. (retrieval dominates on LoCoMo). The disagreement is on benchmark and budget, and LoCoMo's conversations are far shorter.

Clinical:
- Longitudinal EHR, MIMIC-III ICU. Filtering chunks by SNOMED-mapped NER metadata removed 27% of the corpus but kept only 0.84 of gold chunks on the LLM-annotated cohort (1,300 triplets, 5 patients), and removed 35% while keeping 0.77 on the expert cardiovascular cohort (100 queries, about 14 gold of 71 documents per query, 95.8% agreement on a 30-query pilot). Adding HyDE and a recovery classifier raised filtering recall to 0.94 and 0.83, and the full pipeline took Recall from 0.60 to 0.73 (+22%, Recall@3) and 0.47 to 0.58 (+23%, k for this cohort not confirmed in my reading) — [Agarwal et al., BioNLP 2026](https://aclanthology.org/2026.bionlp-1.53/) [PDF]. The authors note that "notes that appear generic or low-priority can still contain critical gold evidence".
- Note generation, not compression of old records: GPT-4 on 25 PriMock primary-care transcripts per experiment across 18 experiments: hallucination 1.47% (191/12,999 note sentences), 44% of them major; omission 3.45% (1,712/49,590 transcript sentences) — [Asgari et al., npj Digital Medicine 2025](https://pmc.ncbi.nlm.nih.gov/articles/12075489/) [HTML].
- ED discharge summaries (UCSF): LLM mean 2.91 errors per summary vs physician 1.82, with omissions twice as likely — [JAMA Internal Medicine](https://jamanetwork-com.libproxy.ajou.ac.kr/journals/jamainternalmedicine/fullarticle/2833236) [ABSTRACT/SNIPPET via a proxy mirror; verify on the journal site].
- EHR temporal weakness of retrieval: in a 41-case disagreement analysis RAG was favored in 23 cases; it won on specific-fact retrieval (12 of 18) but lost temporal and longitudinal reasoning, where full context won 7 of 10 — [arXiv 2510.18691](https://arxiv.org/html/2510.18691v2) [HTML]. Small sample.

### Inferences
- [EXTRAPOLATION] The LongMemEval key/value distinction maps directly onto this design. K=summary/keyphrase with V=full text is "index then full text". Those rows show the index-only search surface is what loses recall, not the full-text step. So old notes should remain searchable at chunk level, and the index should act as an additional route. Tag filters should re-rank or expand, never hard-filter, given Agarwal's 16-23% gold loss.
- Keeping full source is also the project's own invariant: indices and summaries are "derivados e reconstruíveis, nunca substitutos de registros" ([AGENTS.md](../../AGENTS.md)). The evidence and the governance rule point the same way. Discarding old text is ruled out twice.
- [EXTRAPOLATION] Omission in compression is especially concerning for this domain, because a remote detail's salience may only appear later. No study measures this on therapy notes, but TierMem's allergy example is the same structure.
- Do not read "summaries bad" as universal: LoCoMo's observation result and Yuan's BM25 exception show that derived text helps specific readers and retrievers.

### Gaps
- No study found measures recall of remote facts as a function of record age under progressive compression on clinical notes. Agarwal's data is not stratified by age in what I read.
- No study on summary drift across repeated re-summarization of clinical records was found.
- Mem0-vs-long-context ([arXiv 2603.04814](https://arxiv.org/html/2603.04814)) and the MemPalace compression claim (84.2% vs 96.6% R@5, from a [vendor critique](https://vectorize.io/articles/mempalace-benchmarks)) were seen only as snippets and should not be cited without reading.

## Is temporal decay/recency weighting helpful or harmful for remote events? Evidence from temporal RAG and memory systems

### Takeaway
Recency priors help "what is the latest" queries and are parameter-sensitive. I found no study measuring harm to remote-event recall, so harm is a sound inference from the formula rather than an empirical result. Explicit time handling (date metadata, range filters, query intent, validity intervals) has more support than global decay, and memory benchmarks are too compromised for vendor scores to carry weight.

### Cited Findings
- Freshness: on NVD CVE descriptions Latest@10 rose from 0.00 (cosine) to 0.60 with a half-life prior, vs 0.20 for semantic-then-newest. On CERT logs (849,579 events): 1.00 with corpus-tuned weight, 0.00 at the synthetic-tuned default. A synthetic stream gave 1.00, described as a sanity check. Default half-life 14 days. The author concludes freshness via a prior is "real but partial and parameter-sensitive". Trend labeling macro-F1 0.08 with the published rule — [Grofsky, arXiv 2509.19376](https://arxiv.org/pdf/2509.19376) [PDF; single-author preprint, cybersecurity data, no remote-event metric].
- Generative Agents uses exponential decay with factor 0.995 per game hour since last retrieval, combined with relevance and importance via min-max normalized weighted sum. It is a simulation design, not a retrieval evaluation — [Park et al.](https://arxiv.org/pdf/2304.03442) [ABSTRACT/SNIPPET].
- Time-aware query expansion, LongMemEvalM temporal subset, session R@10 with K=V+fact: .721 baseline; .797 with GPT-4o time-range extraction; .711 with Llama 3.1 8B extraction. With K=V: .651 / .707 / .647 — [LongMemEval](https://arxiv.org/html/2410.10813v2) [HTML, columns reconstructed]. The gain depended on a strong LLM and vanished with the small local one.
- LoCoMo temporal is hard for everyone: human F1 92.6 vs GPT-3.5-turbo-16K between 16.8 and 25.0 at 4K-16K context. RAG temporal F1 reached 41-42 with observations vs 21-26 with dialog, although dialog temporal R@k reached 97.3. Temporal failure here is about reading, not finding — [Maharana et al.](https://ar5iv.labs.arxiv.org/html/2402.17753) [HTML].
- LoCoMo reflection analysis: temporal misinterpretation was 27% of identified errors; "LLMs struggle to understand time concepts within dialogues" — [Terranova et al., arXiv 2510.23730](https://arxiv.org/html/2510.23730v2) [HTML; workshop submission]. Average F1, Llama 3.2 3B: full context 32.45 vs RAG 6.45; Qwen2.5 7B: 10.47 vs 21.12; GPT-4o mini: 31.79 vs 29.98. Small-model results swing with the reader and do not generalize.
- Zep/Graphiti: DMR 94.8% vs MemGPT 93.4%; LongMemEval accuracy up to +18.5% and latency -90% relative to baselines — [Rasmussen et al., arXiv 2501.13956](https://arxiv.org/abs/2501.13956) [ABSTRACT, VENDOR]. Graphiti tracks validity with `valid_at`, `invalid_at`, `expired_at` on edges and uses semantic + BM25 with RRF and other rerankers — [Graphiti docs](https://help.getzep.com/graphiti/working-with-data/searching) [ABSTRACT/SNIPPET]; [third-party review](https://zby.github.io/commonplace/agent-memory-systems/reviews/graphiti/). Absence of recency decay is implied by a third party, not confirmed.
- LoCoMo vendor dispute: full-context baseline 72.90% vs Mem0 66.88% and Mem0 Graph 68.44%, as reported by a competitor; Zep claims a corrected 75.14% +/- 0.17 for itself and criticizes the benchmark: conversations of 16-26K tokens fit in context, no knowledge-update questions, unusable category 5, multimodal and speaker-attribution errors — [Zep blog](https://www.getzep.com/blog/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/) [VENDOR]. Mem0's later claims of 91.6 and 92.5 use different algorithms and setups — [Mem0](https://mem0.ai/blog/ai-memory-benchmarks) [VENDOR]. These are not comparable to each other.
- LoCoMo size is itself reported inconsistently: 300 turns / 9K tokens on arXiv vs 600 turns / 16K tokens at ACL — [project page and listing](https://arxiv.deeppaper.ai/papers/2402.17753v1) [ABSTRACT/SNIPPET].
- Temporal RAG work not read in full: [TG-RAG](https://arxiv.org/html/2510.13590v1), [Re3 / Re2Bench](https://aclanthology.org/2026.acl-long.1180.pdf), [Chronofy](https://arxiv.org/pdf/2607.20560). Seen as snippets only, none reported on remote-event recall in what I saw.
- MemGPT-style summarization appears here only as the "summarized episodes" arm of Yuan et al. I did not read a primary Letta evaluation.

### Inferences
- [EXTRAPOLATION] Harm from decay is structural (my arithmetic): a 14-day half-life gives a 2-year-old note 2^(-52), effectively zero, as a multiplier. In a linear fusion it cannot be eliminated, only capped at the recency weight, but it still lowers rank against any recent, moderately similar note. For a clinician asking about a remote event, this is the wrong direction, and the project's objective is exactly to retrieve such events.
- Apply time by query intent: no decay by default; a date filter or recency boost only when the question is explicit ("na última sessão", "em março"). Parsing that with a small local LLM is unreliable according to the Llama 8B result, so deterministic date parsing plus UI date controls is the safer route to test first. Cite note dates in context, and order retrieved chunks chronologically, as arXiv 2510.18691 did.
- Validity intervals map to the domain's versioning and rectification model better than decay does. An outdated statement should be represented by its successor, not faded by age. This does not imply adopting a graph store.
- Retrieval does not resolve temporal reasoning. Evolution questions may need all relevant notes, in order, which is a stronger argument for full text of selected notes than for chunks alone.

### Gaps
- No study found directly measures remote-event recall loss under decay. This is the key gap and a feasible original contribution: stratify Recall@k by evidence age, with and without a recency prior.
- No primary evidence on Mem0 or Letta decay behavior was read; do not state how they treat it.

## What retrieval metrics and evaluation design are appropriate, and how to build a defensible synthetic gold set?

### Takeaway
Evaluate per stage with span-level gold, stratified by evidence age and query type, using deterministic retrieval metrics as primary outcomes and LLM judgments only as secondary and audited. Build gold from a ground-truth event ledger authored before notes are generated. Report results as comparisons between arms on synthetic data, not as absolute clinical performance.

### Cited Findings
- Stage-level instrumentation: Agarwal reports corpus ratio, filtering recall, revived precision and Recall@k per stage, and explains how the design supports auditing — [BioNLP 2026](https://aclanthology.org/2026.bionlp-1.53/) [PDF].
- Four-condition diagnosis with a fixed reader: truncated full context, oracle evidence, complete stored memory, retrieved memory. This separates evidence lost at write from evidence not retrieved — [WhenLoss](https://arxiv.org/abs/2605.24579) [ABSTRACT].
- Yuan et al. separate retrieval failure, utilization failure and hallucination. LLM judge validated against human labels on 200 samples; failure-mode classification 85% accurate — [arXiv 2603.02473](https://arxiv.org/pdf/2603.02473.pdf) [PDF]. Token F1 was insensitive (0.221 vs 0.168 across a 20-point accuracy gap), so surface-overlap metrics can hide real differences.
- Oracle baseline: LongMemEval's oracle vs full-history gap quantifies how much loss is due to context — [LongMemEval](https://arxiv.org/html/2410.10813v2) [HTML].
- LLM-as-judge pairwise comparisons are order-sensitive — [Han et al.](https://arxiv.org/html/2502.11371v2) [HTML].
- Multi-evidence queries matter: the expert cohort averaged 14 gold documents per query vs 1-2 in the LLM cohort, and recall was much lower (0.47 vs 0.60 baseline) — [Agarwal et al.](https://aclanthology.org/2026.bionlp-1.53/) [PDF]. LLM-generated gold is easier than expert gold.
- Synthetic judgments: SynDL built 637,063 LLM-produced query-passage labels — [Rahmani et al.](https://arxiv.org/pdf/2408.16312) [ABSTRACT/SNIPPET]. LLM judges were more lenient than human assessors by about 0.28 on a 0-3 scale on TREC DL 2023, and LLM-based systems scored higher when judged by LLM labels; bias may matter less for comparing systems than for absolute scores — [Towards Understanding Bias in Synthetic Data for Evaluation](https://arxiv.org/html/2506.10301v1) [ABSTRACT/SNIPPET]; synthetic collections tended to overstate performance — [review](https://www.themoonlight.io/en/review/synthetic-test-collections-for-retrieval-evaluation) [secondary]. Evaluation circularity and prompt sensitivity are open issues — [Judging the Judges](https://arxiv.org/html/2502.13908v1) [ABSTRACT/SNIPPET].
- Pooling only traditional systems can bias evaluation of neural ones — [Yilmaz et al.](https://fugumt.com/fugumt/paper_check/2004.13486v1_enmode) [secondary listing].
- Citation verification done deterministically vastly outperformed prompt-based in one preprint (461/500 vs 1/500) — [Zenodo](https://zenodo.org/records/19686739) [single-author preprint].

### Inferences
Proposed design, mine, not from a single source. All sample sizes and targets are left open because AGENTS.md forbids inventing metas.
- Metrics. Primary: Recall@k at note and span level, with k fixed by the context budget of the Ollama model. MRR only for single-gold queries, since it reflects only the first hit. nDCG@k for graded relevance. For multi-gold: evidence coverage (share of gold spans retrieved). For answers: citation precision (share of cited spans that actually support the claim, checked deterministically for existence and adjudicated by humans for support), citation recall, and abstention correctness on unanswerable queries.
- Primary stratification, which is the study's contribution: Recall@k by evidence age (recent / middle / remote, defined by note position before seeing results), by history length (50/100/200), by query type (exact term, paraphrase, multi-note evolution, as-of/temporal, rectified fact, negative/absent).
- Arms: recency window, BM25-only, dense-only, hybrid, summary-only, index-only with full-text return, index + source search + full text, oracle, all with the same reader and token budget.
- Gold construction: (1) write a per-patient event ledger first (fact, date, note, type, what supersedes it). (2) Generate notes from the ledger with facts paraphrased and distributed. (3) Keep query writing separate from note writing, with paraphrase queries having low lexical overlap, because a query copied from the note favors BM25. (4) Gold is the span + note version, derived from the ledger and thus not from any pooled system, avoiding pooling bias. (5) Inject distractors: near-duplicate themes, similar events on other dates, same-name people, and other synthetic patients for adversarial isolation tests. (6) Human clinician review of a stratified sample with reported agreement. (7) Freeze the gold set and analysis plan before running final arms, and tune alpha and k on a separate split.
- Statistics: paired per-query comparison with confidence intervals (bootstrap, or McNemar for hit/miss), reporting patient-level clustering. [General practice; no source collected here.]
- Limit to state in the thesis: synthetic gold validates the mechanism, not clinical performance. Generated notes may be more regular than real narrative notes.

### Gaps
- No published synthetic gold-set protocol specific to psychotherapy or Portuguese clinical notes was found.
- Classic IR methodology sources (Voorhees, Sakai) were not read; add them if the thesis needs primary citations for metric choice.
- Recommended k and minimum query counts have no defensible source here. Decide with a pilot and record the rationale.

## pgvector specifics: exact vs HNSW for small filtered sets; PostgreSQL full-text in Portuguese and field-level encryption

### Takeaway
For 50-200 notes per patient, exact search behind a B-tree patient filter gives perfect recall and is the recommended starting point. A global HNSW index is actively risky because filtering occurs after the index scan. PostgreSQL full-text search cannot run over this project's application-side AES-GCM ciphertext, and a plaintext `tsvector` would effectively undo the encryption, so lexical search has to run in the application after decryption or rely on a reviewed keyed-token scheme. `ts_rank` is not BM25 either way.

### Cited Findings
pgvector:
- Exact nearest-neighbor search is the default and "provides perfect recall". Adding an approximate index trades recall for speed and can change results. Latest version listed: v0.8.7 — [pgvector README](https://github.com/pgvector/pgvector).
- With approximate indexes filtering is applied after the scan: at a 10% match rate and default settings, about 4 rows on average come back. `hnsw.ef_search` default 40. B-tree indexes on the filter column work well when the condition matches a small percentage of rows; partial indexes for few distinct values; partitioning for many — [README](https://github.com/pgvector/pgvector).
- Iterative index scans (0.8.0+) continue until enough rows match or a limit is reached, with `strict_order`/`relaxed_order`, `hnsw.max_scan_tuples` default 20,000 — [README](https://github.com/pgvector/pgvector). They are off by default per [practitioner guidance](https://dev.to/philip_mcclarence_2ef9475/pgvector-in-production-hnsw-filtering-and-tuning-46lj).
- Hybrid in Postgres: combine with full-text, merge by RRF or a cross-encoder — [README](https://github.com/pgvector/pgvector). `halfvec` stores about 2 bytes per dimension, HNSW up to 4,000 dimensions with half-precision vs 2,000 for `vector` — [README](https://github.com/pgvector/pgvector).
- Practitioner reports: a tenant-column index plus flat scan yields 100% recall; fine at 800 rows, poor at 400K; an operator-class mismatch silently produces sequential scans — [ClickHouse article](https://clickhouse.com/resources/engineering/scale-vector-search-postgres) [VENDOR, competitor]; [DEV post](https://dev.to/philip_mcclarence_2ef9475/pgvector-in-production-hnsw-filtering-and-tuning-46lj) [practitioner].

PostgreSQL full-text:
- `ts_rank` ranks on the frequency of matching lexemes, `ts_rank_cd` adds proximity, and the functions "do not use any global information". There is no IDF or BM25 saturation per this documentation. `ts_rank_cd` needs positions: it ignores stripped lexemes and returns 0 if none remain. `to_tsvector` output contains lexemes and positions — [PostgreSQL docs](https://www.postgresql.org/docs/current/textsearch-controls.html).
- A `portuguese_stem` Snowball dictionary exists in `pg_catalog` — [PostgreSQL psql docs, v12 page](https://postgresql.org/docs/12/textsearch-psql.html). `unaccent` is available as a filtering dictionary; synonym dictionaries handle single words; thesauri handle phrases and require reindex on change — [dictionaries docs](https://www.postgresql.org/docs/current/textsearch-dictionaries.html). The built-in configuration named `portuguese` was not confirmed by these pages; verify with `\dF portuguese` on the running instance.
- True BM25 extensions exist: ParadeDB `pg_search` (Tantivy), Timescale `pg_textsearch`, `vchord_bm25` — [ParadeDB](https://www.paradedb.com/blog/introducing-search) [VENDOR]; [pg_textsearch guide](https://serverspace.us/support/help/pg_textsearch-for-postgresql-bm25-full-text-search-and-relevance-ranking) [secondary]. Portuguese analyzer support was not verified.

Encryption:
- The project encrypts clinical text in the application with AES-256-GCM, a random 96-bit nonce and an `enc:v2:` prefix ([encrypted_fields.py](../../Backend/services/security/encrypted_fields.py), read locally). PostgreSQL only ever holds ciphertext. ADR-002 states that "Dados indexados e embeddings requerem avaliação específica" ([ADR-002](../../docs/architecture/ADR-002-criptografia-prontuarios.md), read locally).
- Randomized encryption blocks ordinary indexes and equality on ciphertext; the recommended workaround is a blind index with an HMAC of the plaintext — [EDB docs](https://www.enterprisedb.com/docs/pgd/latest/ensuring-security/column-encryption/) [VENDOR].
- `encsearch` stores keyed HMAC tokens of words and n-grams in a GIN `int8[]` column. Its own notes admit leakage to anyone reading the table: which rows share a value, word or 2-3 character chunks, and how often. v0.1.1, requires PostgreSQL 17 — [encsearch](https://pgxn.org/dist/encsearch/README.html).

### Inferences
- Selectivity arithmetic (mine): with chunk rows for 100 patients of similar size, one patient is about 1% of rows. Extending the README's "10% gives about 4 rows" example, `ef_search=40` yields about 0.4 matching rows. A global HNSW index without iterative scanning would return almost nothing, and worse, it fails silently, as fewer rows look like "no evidence". A silent miss of this kind conflicts with the explicit-failure invariant.
- Recommended start, unbenchmarked: no HNSW index on the chunks table; B-tree on `(clinic_id, patient_id)`; `ORDER BY embedding <=> $1 LIMIT k` over that subset. Assuming about 10 chunks per note, that is 500-2,000 vectors per query, which the sources describe as a size where a flat scan is suitable. No published cutover threshold exists; measure with EXPLAIN ANALYZE. Note that the planner may start using an HNSW index if one is added later, so a regression test should assert the plan and row count.
- The same filter is the security boundary: exact scan with `WHERE clinic_id AND patient_id` never touches other patients' rows, complementing the back-end scoping invariant. Adversarial cross-patient tests are still required.
- Lexical options under encryption [EXTRAPOLATION; security review required, ADR needed]:
  1. In-process BM25 after authorization and decryption, over the single patient's chunks, with nothing persisted. Simplest, leaks nothing to the database, and fits a corpus this small. Cost: every search decrypts the entire patient record in memory, so it needs audit treatment and a latency measurement. Within-patient IDF on a small corpus is noisy and a clinic-level IDF would cross patient boundaries, so it is an open design point.
  2. Encrypted per-patient serialized inverted index, decrypted on demand. Same leak profile as option 1 at the database level, derived and rebuildable as the project requires, but adds invalidation logic on rectification.
  3. Keyed token column (blind index), per-patient or per-clinic key. Database-side matching but leaks frequency and co-occurrence, and loses ts_rank positions unless stored, so ranking would still happen in the app. The n-gram option leaks more.
  4. Plain `tsvector` next to ciphertext. It would require plaintext in the database and stores lexemes with positions, in effect a reversible stemmed copy of the note. It should be rejected. Removing positions with `strip` still leaves a plaintext bag of words and disables `ts_rank_cd`.
  The same constraint applies to `pg_search`/`pg_textsearch`, as they index plaintext stored in the database.
- Embeddings are stored in the clear in pgvector and are derived from clinical text. This remains an open item under ADR-002. Encrypting vectors would prevent database-side similarity, so exact scan would move to the application as well, which is feasible at this scale but changes the design.
- Option 1 implies a Python Portuguese stemmer rather than PostgreSQL's. Behavior will differ from Snowball configuration in Postgres unless the same stemmer is used. Evaluate this on the gold set.

### Gaps
- No official pgvector benchmark for per-tenant exact vs HNSW latency, or planner cutover, was found.
- No source confirmed the leakage of a `tsvector` beside ciphertext specifically; the argument rests on documented `to_tsvector` output and on analogous `encsearch` leakage notes. A [Vulmon entry on pgcrypto cleartext storage](https://vulmon.com/vulnerabilitydetails?qid=CVE-2026-14663) surfaced but was not verified.
- No evidence collected on embedding-inversion risk for clinical text. It needs its own search before ADR-002's pending evaluation can be closed.
- Stemming quality of Portuguese Snowball on clinical and psychological vocabulary was not found; test it rather than assume it.
- Local embedding model choice for Portuguese under Ollama was not covered here.
