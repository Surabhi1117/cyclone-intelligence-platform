"""
Temporal Transformer for Cyclone Dynamics & Environmental Fusion.
Fuses sequence of spatial representations (B, T, spatial_dim) with
environmental vectors (B, T, 6) across consecutive timesteps.
"""

import math
import torch
import torch.nn as nn
from typing import Tuple


class PositionalEncoding(nn.Module):
    """Sinusoidal positional encoding for sequence of observation timesteps."""
    def __init__(self, d_model: int, max_len: int = 32):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # Shape (1, max_len, d_model)
        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (B, T, d_model)
        return x + self.pe[:, :x.size(1)]


class TemporalEnvironmentalTransformer(nn.Module):
    """
    Multi-layer Transformer Encoder fusing multi-spectral satellite embeddings
    with 6D environmental parameters (SST, VWS, 850 Vorticity, 200 Divergence, RH700, OHC).
    """
    def __init__(
        self,
        spatial_dim: int = 256,
        env_dim: int = 6,
        d_model: int = 256,
        nhead: int = 8,
        num_layers: int = 3,
        dim_feedforward: int = 512,
        dropout: float = 0.1
    ):
        super().__init__()
        self.d_model = d_model
        
        # Environmental feature projection (6D -> 64D)
        self.env_proj = nn.Sequential(
            nn.Linear(env_dim, 64),
            nn.LayerNorm(64),
            nn.SiLU(),
            nn.Linear(64, 64)
        )

        # Fusion projection (spatial_dim + 64 -> d_model)
        self.fusion_proj = nn.Sequential(
            nn.Linear(spatial_dim + 64, d_model),
            nn.LayerNorm(d_model),
            nn.Dropout(dropout)
        )

        self.pos_encoder = PositionalEncoding(d_model)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            activation="gelu",
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Temporal aggregation attention pooling
        self.attn_pool = nn.Sequential(
            nn.Linear(d_model, 1),
            nn.Softmax(dim=1)
        )

    def forward(self, spatial_features: torch.Tensor, env_features: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            spatial_features: (B, T, spatial_dim)
            env_features: (B, T, 6)
        Returns:
            fused_seq: (B, T, d_model)
            context_summary: (B, d_model)
        """
        B, T, _ = spatial_features.shape
        
        # Project environmental parameters
        env_emb = self.env_proj(env_features)  # (B, T, 64)
        
        # Concatenate spatial tokens and environmental tokens
        combined = torch.cat([spatial_features, env_emb], dim=-1)  # (B, T, spatial_dim + 64)
        fused = self.fusion_proj(combined)  # (B, T, d_model)
        fused = self.pos_encoder(fused)

        # Process through temporal self-attention
        out_seq = self.transformer_encoder(fused)  # (B, T, d_model)

        # Context summary via temporal attention pooling
        attn_weights = self.attn_pool(out_seq)  # (B, T, 1)
        context_summary = torch.sum(attn_weights * out_seq, dim=1)  # (B, d_model)

        return out_seq, context_summary

