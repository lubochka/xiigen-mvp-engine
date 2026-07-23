"""
XIIGen ML-Optimized RAG Implementation v2.1
P1-compliant: tenant_id mandatory on all RAG documents and queries.
Algorithms from ml_algorithms_implementations_en.md.

v2.0 → v2.1 changes:
  - RagDocument: added tenant_id field (P1 compliance)
  - All ES queries filter by tenant_id (P1 compliance)
  - MLPoweredRagPipeline.retrieve() requires tenant_id parameter
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json
from collections import defaultdict
import math


# ============================================================================
# DATA STRUCTURES
# ============================================================================

class PatternType(Enum):
    SERVICE_PATTERN = "SERVICE_PATTERN"
    BFA_RULE = "BFA_RULE"
    DESIGN_RECORD = "DESIGN_RECORD"
    TASK_CONTRACT = "TASK_CONTRACT"
    SKILL_PATTERN = "SKILL_PATTERN"
    STRESS_TEST = "STRESS_TEST"


@dataclass
class RagDocument:
    """
    RAG document as stored in xiigen-rag-patterns index.
    P1 compliance: tenant_id is mandatory.
    """
    pattern_id: str
    tenant_id: str          # P1: MANDATORY — platform or tenant-specific
    domain_id: str
    pattern_type: PatternType
    keywords: str
    tags: List[str]
    code_snippet: Optional[str] = None
    factory_id: Optional[str] = None
    interface_name: Optional[str] = None
    archetype: Optional[str] = None
    embedding: Optional[np.ndarray] = None   # For clustering — not stored in ES

    def to_es_doc(self) -> Dict[str, Any]:
        """Serialize to Elasticsearch document (excludes embedding)."""
        return {
            "patternId": self.pattern_id,
            "tenantId": self.tenant_id,           # P1 compliance
            "domainId": self.domain_id,
            "patternType": self.pattern_type.value,
            "searchable": {
                "keywords": self.keywords,
                "tags": self.tags,
                "codeSnippet": self.code_snippet,
            },
            "metadata": {
                "factoryId": self.factory_id,
                "interfaceName": self.interface_name,
                "archetype": self.archetype,
            }
        }


@dataclass
class TaskCharacteristics:
    """Analyzed characteristics of a code generation task."""
    task_type: str
    complexity: int  # 1-10 scale
    has_state_management: bool
    has_data_persistence: bool
    has_multi_tenant: bool
    has_async_operations: bool
    estimated_loc: int


@dataclass
class RetrievalStrategy:
    """Learned strategy for document retrieval."""
    name: str
    top_k: int
    doc_type_weights: Dict[str, float]
    use_clustering: bool


@dataclass
class RetrievalResult:
    """Result from ML-powered retrieval, including tenant context."""
    tenant_id: str            # P1: which tenant performed this retrieval
    patterns: List[RagDocument]
    strategy: str
    confidence: float
    cluster_id: int
    top_k: int
    doc_type_probabilities: Dict[str, float]
    rag_tier: str             # "global" or "local"
    rag_metrics: Dict[str, Any] = field(default_factory=dict)


# ============================================================================
# 1. NAIVE BAYES CLASSIFIER
# Purpose: Predict which document types are most relevant
# ============================================================================

class DocumentRelevanceClassifier:
    """
    Naive Bayes classifier for predicting relevant document types.
    Learns P(doc_type | task_type, keywords) from training data.
    """

    def __init__(self):
        self.priors: Dict[str, float] = {}
        self.likelihoods: Dict[str, Dict[str, float]] = defaultdict(
            lambda: defaultdict(float)
        )
        self.vocabulary: set = set()
        self.doc_type_counts: Dict[str, int] = defaultdict(int)
        self.keyword_doc_type_counts: Dict[Tuple[str, str], int] = defaultdict(int)
        self.total_docs = 0

    def fit(self, training_data: List[Dict[str, Any]]) -> None:
        """
        Train on historical successful retrievals.

        training_data item:
          tenant_id: str              (P1 — which tenant)
          task_type: str
          keywords: List[str]
          relevant_doc_types: List[str]
          score: float
        """
        self.doc_type_counts.clear()
        self.keyword_doc_type_counts.clear()
        self.vocabulary.clear()
        self.total_docs = 0

        for example in training_data:
            keywords = example['keywords']
            relevant_types = example['relevant_doc_types']
            self.vocabulary.update(keywords)

            for doc_type in relevant_types:
                self.doc_type_counts[doc_type] += 1
                self.total_docs += 1
                for keyword in keywords:
                    self.keyword_doc_type_counts[(keyword, doc_type)] += 1

        for doc_type, count in self.doc_type_counts.items():
            self.priors[doc_type] = count / self.total_docs

        vocab_size = len(self.vocabulary)
        for doc_type in self.doc_type_counts.keys():
            total_kw = sum(
                count for (kw, dt), count in self.keyword_doc_type_counts.items()
                if dt == doc_type
            )
            for keyword in self.vocabulary:
                count = self.keyword_doc_type_counts[(keyword, doc_type)]
                self.likelihoods[doc_type][keyword] = (
                    (count + 1) / (total_kw + vocab_size)
                )

    def predict(self, keywords: List[str]) -> Dict[str, float]:
        """Predict probability distribution over document types."""
        if not self.priors:
            # Untrained fallback: uniform distribution
            types = [t.value for t in PatternType]
            return {t: 1.0 / len(types) for t in types}

        scores = {}
        for doc_type in self.priors.keys():
            score = math.log(self.priors[doc_type])
            for keyword in keywords:
                if keyword in self.vocabulary:
                    likelihood = self.likelihoods[doc_type].get(keyword, 1e-10)
                    score += math.log(likelihood)
            scores[doc_type] = score

        max_score = max(scores.values())
        exp_scores = {dt: math.exp(s - max_score) for dt, s in scores.items()}
        total = sum(exp_scores.values())
        return {dt: score / total for dt, score in exp_scores.items()}


# ============================================================================
# 2. K-MEANS CLUSTERING
# Purpose: Group similar patterns for faster retrieval
# ============================================================================

class PatternClusterer:
    """
    K-Means clustering to organize patterns into semantic groups.
    Enables fast retrieval by searching only relevant clusters.
    """

    def __init__(self, n_clusters: int = 20):
        self.n_clusters = n_clusters
        self.centroids: Optional[np.ndarray] = None
        self.cluster_assignments: Dict[str, int] = {}
        self.cluster_members: Dict[int, List[str]] = defaultdict(list)

    def fit(self, patterns: List[RagDocument], max_iterations: int = 100) -> None:
        """Cluster patterns based on their embeddings."""
        if not patterns or any(p.embedding is None for p in patterns):
            raise ValueError("All patterns must have embeddings before clustering")

        embeddings = np.array([p.embedding for p in patterns])
        pattern_ids = [p.pattern_id for p in patterns]
        n_samples = len(embeddings)

        random_indices = np.random.choice(n_samples, self.n_clusters, replace=False)
        self.centroids = embeddings[random_indices].copy()

        for iteration in range(max_iterations):
            distances = self._compute_distances(embeddings, self.centroids)
            assignments = np.argmin(distances, axis=1)

            new_centroids = np.zeros_like(self.centroids)
            for k in range(self.n_clusters):
                cluster_points = embeddings[assignments == k]
                if len(cluster_points) > 0:
                    new_centroids[k] = cluster_points.mean(axis=0)
                else:
                    new_centroids[k] = self.centroids[k]

            if np.allclose(self.centroids, new_centroids, rtol=1e-4):
                print(f"K-Means converged at iteration {iteration}")
                break

            self.centroids = new_centroids

        final_distances = self._compute_distances(embeddings, self.centroids)
        final_assignments = np.argmin(final_distances, axis=1)

        self.cluster_assignments.clear()
        self.cluster_members.clear()

        for pattern_id, cluster_id in zip(pattern_ids, final_assignments):
            self.cluster_assignments[pattern_id] = int(cluster_id)
            self.cluster_members[int(cluster_id)].append(pattern_id)

    def find_nearest_cluster(self, query_embedding: np.ndarray) -> int:
        if self.centroids is None:
            raise ValueError("Clusterer not fitted yet")
        distances = np.linalg.norm(self.centroids - query_embedding, axis=1)
        return int(np.argmin(distances))

    def get_cluster_members(self, cluster_id: int) -> List[str]:
        return self.cluster_members[cluster_id]

    def _compute_distances(
        self, points: np.ndarray, centroids: np.ndarray
    ) -> np.ndarray:
        return np.linalg.norm(
            points[:, np.newaxis, :] - centroids[np.newaxis, :, :],
            axis=2
        )


# ============================================================================
# 3. DECISION TREE
# Purpose: Learn retrieval strategy rules
# ============================================================================

@dataclass
class DecisionNode:
    feature: Optional[str] = None
    threshold: Optional[float] = None
    left: Optional['DecisionNode'] = None
    right: Optional['DecisionNode'] = None
    value: Optional[str] = None

    def is_leaf(self) -> bool:
        return self.value is not None


class RetrievalStrategyLearner:
    """
    Decision tree to learn which retrieval strategy works best
    for different task characteristics.
    """

    def __init__(self, max_depth: int = 10, min_samples_split: int = 5):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.tree: Optional[DecisionNode] = None
        self.feature_names = [
            'complexity', 'has_state_management', 'has_data_persistence',
            'has_multi_tenant', 'has_async_operations', 'estimated_loc'
        ]

    def fit(self, training_data: List[Dict[str, Any]]) -> None:
        """
        Train on successful retrieval strategies.

        training_data item:
          tenant_id: str            (P1 — context for training)
          characteristics: TaskCharacteristics
          strategy: str
          score: float
        """
        X, y = [], []
        for example in training_data:
            chars = example['characteristics']
            X.append([
                chars.complexity,
                1 if chars.has_state_management else 0,
                1 if chars.has_data_persistence else 0,
                1 if chars.has_multi_tenant else 0,
                1 if chars.has_async_operations else 0,
                chars.estimated_loc / 100,
            ])
            y.append(example['strategy'])

        self.tree = self._build_tree(np.array(X), np.array(y), depth=0)

    def predict(self, characteristics: TaskCharacteristics) -> str:
        if self.tree is None:
            return 'BALANCED'  # Safe default

        features = np.array([
            characteristics.complexity,
            1 if characteristics.has_state_management else 0,
            1 if characteristics.has_data_persistence else 0,
            1 if characteristics.has_multi_tenant else 0,
            1 if characteristics.has_async_operations else 0,
            characteristics.estimated_loc / 100,
        ])
        return self._traverse_tree(self.tree, features)

    def _build_tree(
        self, X: np.ndarray, y: np.ndarray, depth: int
    ) -> DecisionNode:
        n_samples = len(y)
        if depth >= self.max_depth or n_samples < self.min_samples_split:
            unique, counts = np.unique(y, return_counts=True)
            return DecisionNode(value=unique[np.argmax(counts)])

        if len(np.unique(y)) == 1:
            return DecisionNode(value=y[0])

        best_feature, best_threshold = self._find_best_split(X, y)
        if best_feature is None:
            unique, counts = np.unique(y, return_counts=True)
            return DecisionNode(value=unique[np.argmax(counts)])

        left_mask = X[:, best_feature] <= best_threshold
        return DecisionNode(
            feature=self.feature_names[best_feature],
            threshold=best_threshold,
            left=self._build_tree(X[left_mask], y[left_mask], depth + 1),
            right=self._build_tree(X[~left_mask], y[~left_mask], depth + 1),
        )

    def _find_best_split(
        self, X: np.ndarray, y: np.ndarray
    ) -> Tuple[Optional[int], Optional[float]]:
        best_gini, best_feature, best_threshold = float('inf'), None, None
        for fi in range(X.shape[1]):
            for threshold in np.unique(X[:, fi]):
                left_mask = X[:, fi] <= threshold
                if np.sum(left_mask) == 0 or np.sum(~left_mask) == 0:
                    continue
                gini = self._weighted_gini(y[left_mask], y[~left_mask])
                if gini < best_gini:
                    best_gini, best_feature, best_threshold = gini, fi, threshold
        return best_feature, best_threshold

    def _weighted_gini(self, left_y: np.ndarray, right_y: np.ndarray) -> float:
        n = len(left_y) + len(right_y)
        return (
            (len(left_y) / n) * self._gini_impurity(left_y) +
            (len(right_y) / n) * self._gini_impurity(right_y)
        )

    def _gini_impurity(self, y: np.ndarray) -> float:
        if len(y) == 0:
            return 0
        _, counts = np.unique(y, return_counts=True)
        probs = counts / len(y)
        return 1 - np.sum(probs ** 2)

    def _traverse_tree(self, node: DecisionNode, features: np.ndarray) -> str:
        if node.is_leaf():
            return node.value
        fi = self.feature_names.index(node.feature)
        if features[fi] <= node.threshold:
            return self._traverse_tree(node.left, features)
        return self._traverse_tree(node.right, features)


# ============================================================================
# 4. LINEAR REGRESSION
# Purpose: Predict optimal topK value
# ============================================================================

class TopKOptimizer:
    """Linear regression to predict optimal topK based on task complexity."""

    def __init__(self):
        self.coefficients: Optional[np.ndarray] = None

    def fit(self, training_data: List[Dict[str, Any]]) -> None:
        """
        training_data item:
          tenant_id: str            (P1 — context for training)
          task_complexity: int
          context_size: int
          optimal_top_k: int
          score: float
        """
        X, y = [], []
        for example in training_data:
            X.append([example['task_complexity'], example['context_size'] / 10000, 1])
            y.append(example['optimal_top_k'])

        X_arr, y_arr = np.array(X), np.array(y)
        try:
            self.coefficients = np.linalg.solve(X_arr.T @ X_arr, X_arr.T @ y_arr)
        except np.linalg.LinAlgError:
            self.coefficients = np.linalg.pinv(X_arr.T @ X_arr) @ X_arr.T @ y_arr

    def predict(self, task_complexity: int, context_size: int) -> int:
        if self.coefficients is None:
            return 5  # Safe default

        features = np.array([task_complexity, context_size / 10000, 1])
        return max(3, min(15, round(float(features @ self.coefficients))))


# ============================================================================
# 5. INTEGRATED ML-POWERED RAG PIPELINE
# ============================================================================

class MLPoweredRagPipeline:
    """
    Complete ML-optimized RAG retrieval pipeline integrating all components.
    P1-compliant: tenant_id required on every retrieve() call.
    """

    def __init__(
        self,
        classifier: DocumentRelevanceClassifier,
        clusterer: PatternClusterer,
        strategy_learner: RetrievalStrategyLearner,
        topk_optimizer: TopKOptimizer,
    ):
        self.classifier = classifier
        self.clusterer = clusterer
        self.strategy_learner = strategy_learner
        self.topk_optimizer = topk_optimizer

    def retrieve(
        self,
        tenant_id: str,           # P1: REQUIRED
        task_type: str,
        requirements: str,
        keywords: List[str],
        query_embedding: np.ndarray,
        model_context_size: int,
        all_patterns: List[RagDocument],
        rag_tier: str = "local",  # P4: "global" or "local"
    ) -> RetrievalResult:
        """
        Retrieve most relevant patterns using ML-optimized approach.
        Only returns patterns matching tenant_id (P1 isolation).
        """
        if not tenant_id:
            raise ValueError("tenant_id is required (P1 compliance)")

        # P1: Filter patterns by tenant_id before any ML processing
        tenant_patterns = [p for p in all_patterns if p.tenant_id == tenant_id]

        # 1. Classify relevant document types
        doc_type_probs = self.classifier.predict(keywords)

        # 2. Analyze task characteristics
        characteristics = self._analyze_task(task_type, requirements)

        # 3. Determine retrieval strategy
        strategy = self.strategy_learner.predict(characteristics)

        # 4. Calculate optimal topK
        top_k = self.topk_optimizer.predict(
            characteristics.complexity, model_context_size
        )

        # 5. Find nearest cluster (if clusterer is trained)
        cluster_id = 0
        cluster_size = len(tenant_patterns)
        candidate_patterns = tenant_patterns

        if self.clusterer.centroids is not None and query_embedding is not None:
            cluster_id = self.clusterer.find_nearest_cluster(query_embedding)
            cluster_members = set(self.clusterer.get_cluster_members(cluster_id))
            cluster_patterns = [p for p in tenant_patterns if p.pattern_id in cluster_members]
            if cluster_patterns:
                candidate_patterns = cluster_patterns
                cluster_size = len(cluster_patterns)

        # 6. Score and rank patterns
        scored = self._score_patterns(candidate_patterns, query_embedding, doc_type_probs)

        # 7. Select top-K
        top_patterns = scored[:top_k]

        # 8. Calculate confidence
        confidence = self._calculate_confidence(doc_type_probs, top_patterns)

        return RetrievalResult(
            tenant_id=tenant_id,
            patterns=top_patterns,
            strategy=strategy,
            confidence=confidence,
            cluster_id=cluster_id,
            top_k=top_k,
            doc_type_probabilities=doc_type_probs,
            rag_tier=rag_tier,
            rag_metrics={
                "documentsRetrieved": len(top_patterns),
                "totalCandidates": cluster_size,
                "classifierConfidence": max(doc_type_probs.values()) if doc_type_probs else 0,
                "strategyPrediction": strategy,
                "predictedTopK": top_k,
            }
        )

    def _analyze_task(self, task_type: str, requirements: str) -> TaskCharacteristics:
        req_lower = requirements.lower()
        complexity = 1
        if any(w in req_lower for w in ['complex', 'advanced', 'distributed']):
            complexity += 3
        if any(w in req_lower for w in ['workflow', 'orchestration', 'pipeline']):
            complexity += 2
        if any(w in req_lower for w in ['validation', 'transform', 'process']):
            complexity += 1

        return TaskCharacteristics(
            task_type=task_type,
            complexity=min(10, complexity),
            has_state_management='state' in req_lower or 'workflow' in req_lower,
            has_data_persistence='store' in req_lower or 'save' in req_lower or 'database' in req_lower,
            has_multi_tenant='tenant' in req_lower or 'isolation' in req_lower,
            has_async_operations='async' in req_lower or 'queue' in req_lower or 'event' in req_lower,
            estimated_loc=len(requirements.split()) * 2,
        )

    def _score_patterns(
        self,
        patterns: List[RagDocument],
        query_embedding: Optional[np.ndarray],
        doc_type_probs: Dict[str, float],
    ) -> List[RagDocument]:
        scored = []
        for pattern in patterns:
            type_prob = doc_type_probs.get(pattern.pattern_type.value, 0.1)

            if query_embedding is not None and pattern.embedding is not None:
                similarity = self._cosine_similarity(query_embedding, pattern.embedding)
                score = 0.7 * similarity + 0.3 * type_prob
            else:
                score = type_prob

            scored.append((pattern, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [p for p, _ in scored]

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def _calculate_confidence(
        self,
        doc_type_probs: Dict[str, float],
        selected_patterns: List[RagDocument],
    ) -> float:
        if not doc_type_probs:
            return 0.5

        probs = list(doc_type_probs.values())
        entropy = -sum(p * math.log(p + 1e-10) for p in probs)
        max_entropy = math.log(len(probs))
        normalized_entropy = entropy / max_entropy if max_entropy > 0 else 1

        top_types = {t for t, _ in sorted(doc_type_probs.items(), key=lambda x: x[1], reverse=True)[:3]}
        coverage = sum(
            1 for p in selected_patterns if p.pattern_type.value in top_types
        ) / max(len(selected_patterns), 1)

        return 0.4 * (1 - normalized_entropy) + 0.6 * coverage


# ============================================================================
# USAGE EXAMPLE
# ============================================================================

if __name__ == "__main__":
    print("XIIGen ML-Optimized RAG v2.1 — P1-compliant")
    print("=" * 60)

    # Sample training data (P1: tenant_id on each example)
    training_classifier = [
        {
            'tenant_id': 'platform',
            'task_type': 'T307',
            'keywords': ['form', 'schema', 'validation', 'database'],
            'relevant_doc_types': ['SERVICE_PATTERN', 'BFA_RULE'],
            'score': 85.5,
        },
        {
            'tenant_id': 'platform',
            'task_type': 'T112',
            'keywords': ['workflow', 'state', 'transition', 'orchestration'],
            'relevant_doc_types': ['SERVICE_PATTERN', 'DESIGN_RECORD'],
            'score': 90.2,
        },
    ]

    classifier = DocumentRelevanceClassifier()
    classifier.fit(training_classifier)

    test_keywords = ['form', 'validation', 'schema']
    probs = classifier.predict(test_keywords)
    print(f"\nPredicted probabilities for {test_keywords}:")
    for doc_type, prob in sorted(probs.items(), key=lambda x: x[1], reverse=True):
        print(f"  {doc_type}: {prob:.3f}")

    print("\n✓ ML-Optimized RAG v2.1 ready!")
    print("\nKey changes from v1.0:")
    print("  + RagDocument.tenant_id field added (P1 compliance)")
    print("  + retrieve() requires tenant_id parameter (P1 compliance)")
    print("  + Patterns filtered by tenant_id before ML processing")
    print("  + RetrievalResult includes tenant_id and rag_tier fields")
