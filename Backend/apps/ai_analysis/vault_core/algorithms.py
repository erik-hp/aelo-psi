import hashlib
import hmac
from decimal import Decimal

import igraph as ig
from django.conf import settings


def detect_communities(nodes, edges):
    if not nodes:
        return []
    indices = {node.id: index for index, node in enumerate(nodes)}
    pairs = [(indices[edge.source_id], indices[edge.target_id]) for edge in edges if edge.source_id in indices and edge.target_id in indices]
    graph = ig.Graph(n=len(nodes), edges=pairs, directed=False)
    if not pairs:
        return [[str(node.id)] for node in nodes]
    weights = [max(float(edge.confidence), 0.01) for edge in edges if edge.source_id in indices and edge.target_id in indices]
    partition = graph.community_leiden(objective_function="modularity", weights=weights, n_iterations=2)
    return [[str(nodes[index].id) for index in group] for group in partition]


def fingerprint(patient_id, kind, label):
    value = f"{patient_id}:{kind}:{label.casefold().strip()}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), value, hashlib.sha256).hexdigest()


def weighted_centrality(nodes, edges, reference_date):
    scores = {node.id: Decimal("0") for node in nodes}
    for edge in edges:
        days = max((reference_date - edge.observed_at).days, 0)
        contribution = edge.weight * (Decimal("0.98") ** days)
        scores[edge.source_id] += contribution
        scores[edge.target_id] += contribution
    return scores
